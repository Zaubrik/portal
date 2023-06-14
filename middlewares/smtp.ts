import {
  type ClientOptions,
  type Context,
  createHttpError,
  isFunction,
  isHttpError,
  isPresent,
  isSingleMail,
  isString,
  type SendConfig,
  SMTPClient,
  Status,
} from "./deps.ts";

type Options = { isTest?: boolean };
type SendConfigCb = (
  id: string,
  bodyMessage: string,
) => SendConfig | Promise<SendConfig>;

/**
 * A curried middleware which takes `ClientOptions` and `createSendConfig` and
 * sends an email via an SMTP server.
 * ```ts
 * const clientOptions = {
 *   connection: {
 *     hostname: "",
 *     port: 465,
 *     auth: {
 *       username: "",
 *       password: "",
 *     },
 *   },
 *   client: {
 *     warning: "error" as const,
 *   },
 * };
 *
 * const emails = {
 *   abc: "jane.doe@example.com",
 *   def: "joe.smith@example.com",
 * };
 *
 * function createSendConfig(id: string, bodyMessage: string) {
 *   const to = emails[id as keyof typeof emails];
 *   if (!to) {
 *     throw new Error("No email address was found.");
 *   }
 *   return {
 *     from: "joe@example.com",
 *     to,
 *     subject: "Hallo",
 *     content: bodyMessage,
 *   };
 * }
 *
 * post({pathname: "/email/:id/send"})(send(clientOptions, sendConfigOrCb)
 * ```
 */
export function send(
  clientOptions: ClientOptions,
  sendConfigOrCb?: SendConfig | SendConfigCb,
  { isTest = false }: Options = {},
) {
  if (isTest) {
    return <C extends Context>(ctx: C): C => {
      ctx.response = new Response();
      return ctx;
    };
  }
  return async <C extends Context>(ctx: C): Promise<C> => {
    try {
      const { id } = getPathnameParams(ctx);
      const bodyMessage = await ctx.request.text();
      const sendConfig = sendConfigOrCb
        ? isFunction(sendConfigOrCb)
          ? await (sendConfigOrCb as SendConfigCb)(id, bodyMessage)
          : sendConfigOrCb
        : JSON.parse(bodyMessage);
      if (isSendConfig(sendConfig)) {
        try {
          await sendEmail(clientOptions, [sendConfig]);
          ctx.response = new Response();
          return ctx;
        } catch (error) {
          throw createHttpError(Status.InternalServerError, error.message);
        }
      } else {
        throw createHttpError(
          Status.BadRequest,
          "The 'SendConfig' is invalid.",
        );
      }
    } catch (error) {
      throw isHttpError(error)
        ? error
        : createHttpError(Status.BadRequest, error.message);
    }
  };
}

function getPathnameParams(ctx: Context): { id: string } {
  const { id } = ctx.params.pathname.groups;
  if (!id) {
    throw createHttpError(
      Status.InternalServerError,
      "Invalid pathname params.",
    );
  }
  return { id };
}

async function* makeGenerator(sendConfigs: SendConfig[], client: SMTPClient) {
  const i = sendConfigs.findIndex((config) =>
    !isSingleMail(config.to as string)
  );
  if (i >= 0) {
    throw new Error(`The sendconfig with the index ${i} has an invalid email.`);
  }
  for (const config of sendConfigs) {
    yield await client.send(config); // Returns `undefined`
    console.log("sendConfig:", config);
  }
}

export async function sendEmail(
  clientOptions: ClientOptions,
  sendConfigs: SendConfig[],
) {
  const client = new SMTPClient(clientOptions);
  const results = [];
  try {
    for await (const result of makeGenerator(sendConfigs, client)) {
      results.push(result);
    }
    await client.close();
    return results.length;
  } catch (error) {
    try {
      await client.close();
    } catch {
      (() => {});
    }
    throw error;
  }
}

// https://github.com/EC-Nordbund/denomailer/blob/main/config/mail/mod.ts
// deno-lint-ignore no-explicit-any
function isSendConfig(input: any): input is SendConfig {
  return isPresent(input?.to) && isString(input?.from) &&
    isString(input?.subject);
}
