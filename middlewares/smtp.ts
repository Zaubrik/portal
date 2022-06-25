import { Context } from "../portal.ts";
import {
  ClientOptions,
  createHttpError,
  isHttpError,
  isObjectWide,
  isResponse,
  SendConfig,
  SMTPClient,
  Status,
  tryToParse,
} from "./deps.ts";

type SendConfigOrCb = SendConfig | {
  cb: (id: string, data: Record<string, unknown>) => SendConfig;
  idGroup: string;
};
type Options = { isDryRun?: boolean };

/**
 * Takes `ClientOptions` and `SendConfig` or a callback Config, sends an email
 * with SMTP and returns or throws a `Response`.
 * ```ts
 * const clientOptions = {
 *   connection: {
 *     hostname: "",
 *     port: 465,
 *     tls: true,
 *     auth: {
 *       username: "",
 *       password: "",
 *     },
 *   },
 * };
 *
 * const sendConfig = {
 *   from: "",
 *   to: "",
 *   bcc: "",
 *   subject: "",
 *   content: "",
 * };
 *
 * const smtpClient = new SMTPClient(clientOptions);
 * await smtpClient.send(sendConfig);
 * await smtpClient.close();
 * ```
 */
export function send(
  clientOptions: ClientOptions,
  sendConfigOrCb: SendConfigOrCb,
  { isDryRun = false }: Options = {},
) {
  if (isDryRun) return (_ctx: Context) => new Response();
  const client = new SMTPClient(clientOptions);
  return async (ctx: Context): Promise<Response> => {
    if (
      "idGroup" in sendConfigOrCb &&
      !ctx.urlPatternResult.pathname.groups[sendConfigOrCb.idGroup]
    ) {
      throw createHttpError(
        Status.InternalServerError,
        "Using a callback requires a group match.",
      );
    }
    const body = await ctx.request.text();
    if ("idGroup" in sendConfigOrCb) {
      const [bodyData, err] = tryToParse(body);
      if (isObjectWide(bodyData)) {
        const sendConfig = sendConfigOrCb.cb(
          ctx.urlPatternResult.pathname.groups[sendConfigOrCb.idGroup],
          bodyData,
        );
        return await sendEmail(client, sendConfig);
      } else {
        throw createHttpError(
          Status.BadRequest,
          "The body's data is not a JSON object.",
        );
      }
    } else {
      return await sendEmail(client, { ...sendConfigOrCb, content: body });
    }
  };
}

export async function sendEmail(client: SMTPClient, sendConfig: SendConfig) {
  try {
    await client.send(sendConfig);
    await client.close();
    return new Response();
  } catch (_err) {
    throw createHttpError(Status.InternalServerError);
  }
}
