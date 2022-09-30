import {
  ClientOptions,
  Context,
  createHttpError,
  isHttpError,
  isObject,
  isPresent,
  isString,
  SendConfig,
  SMTPClient,
  Status,
} from "../deps.ts";

type Options = { isTest?: boolean };

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
 * post({pathname: "/email/:id/send"})(configureAndSend(clientOptions, createSendConfig)
 * ```
 */
export function configureAndSend(
  clientOptions: ClientOptions,
  createSendConfig: (
    id: string,
    bodyMessage: string,
  ) => SendConfig | Promise<SendConfig>,
  { isTest = false }: Options = {},
) {
  if (isTest) return (_ctx: Context) => new Response();
  const client = new SMTPClient(clientOptions);
  return async <C extends Context>(ctx: C): Promise<C> => {
    try {
      const { id } = getPathnameParams(ctx);
      const bodyMessage = await ctx.request.text();
      await sendEmail(client, await createSendConfig(id, bodyMessage));
      return ctx;
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

export async function sendEmail(client: SMTPClient, sendConfig: SendConfig) {
  try {
    await client.send(sendConfig);
    await client.close();
    return new Response();
  } catch (err) {
    throw createHttpError(Status.InternalServerError, err.message);
  }
}

export function send(clientOptions: ClientOptions) {
  const client = new SMTPClient(clientOptions);
  return async <C extends Context>(ctx: C): Promise<C> => {
    try {
      const sendConfig = await ctx.request.json();
      if (isSendConfig(sendConfig)) {
        await sendEmail(client, sendConfig);
        return ctx;
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

// https://github.com/EC-Nordbund/denomailer/blob/main/config/mail/mod.ts
function isSendConfig(input: any): input is SendConfig {
  return isPresent(input?.to) && isString(input?.from) &&
    isString(input?.subject);
}
