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
} from "./deps.ts";

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
 *   contact: "",
 * };
 *
 * const smtpClient = new SMTPClient(clientOptions);
 * await smtpClient.send(sendConfig);
 * await smtpClient.close();
 * ```
 */
export function send(
  clientOptions: ClientOptions,
  sendConfigOrCb: SendConfig | {
    cb: ((id: string, data: Record<string, unknown>) => SendConfig);
    idGroup: string;
  },
  { isDryRun = false }: Options = {},
) {
  if (isDryRun) return (_ctx: Context) => new Response(null);
  const client = new SMTPClient(clientOptions);
  return async (ctx: Context) => {
    try {
      if (
        "idGroup" in sendConfigOrCb &&
        !ctx.urlPatternResult.pathname.groups[sendConfigOrCb.idGroup]
      ) {
        throw new Error("Using a callback requires a group match.");
      }
      const body = await ctx.request.text();
      const bodyData = JSON.parse(body);
      if (isObjectWide(bodyData)) {
        try {
          const sendConfig = "idGroup" in sendConfigOrCb
            ? sendConfigOrCb.cb(
              ctx.urlPatternResult.pathname.groups[sendConfigOrCb.idGroup],
              bodyData,
            )
            : { ...sendConfigOrCb, content: body };
          await client.send(sendConfig);
          await client.close();
          return new Response(null, { status: 200 });
        } catch (_err) {
          throw createHttpError(Status.InternalServerError);
        }
      } else {
        throw new Error("The body's data must be an object.");
      }
    } catch (errorOrResponse) {
      if (isResponse(errorOrResponse) || isHttpError(errorOrResponse)) {
        throw errorOrResponse;
      } else {
        throw createHttpError(Status.BadRequest);
      }
    }
  };
}
