import { Context } from "../portal.ts";
import {
  ConnectConfig,
  ConnectConfigWithAuthentication,
  SendConfig,
  SmtpClient,
} from "./deps.ts";

export type { ConnectConfig, ConnectConfigWithAuthentication, SendConfig };
export type Options = { isTls?: boolean; headers?: Headers };

const client = new SmtpClient();

function isObjectWide(obj: unknown): obj is Record<string, unknown> {
  return (
    obj !== null && typeof obj === "object" && Array.isArray(obj) === false
  );
}

/**
 * Takes `ConnectConfig`, `SendConfig` and `Options`, sends an email with
 * SMTP and returns or throws a `Response`.
 */
export function send(
  connectConfig: ConnectConfig | ConnectConfigWithAuthentication,
  sendConfigOrCb: SendConfig | {
    cb: ((id: string, data: Record<string, unknown>) => SendConfig);
    idGroup: string;
  },
  { isTls = true, headers = new Headers() }: Options = {},
) {
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
          if (isTls) {
            await client.connectTLS(connectConfig);
          } else {
            await client.connect(connectConfig);
          }
          await client.send(sendConfig);
          await client.close();
          return new Response(null, { status: 200, headers });
        } catch (_err) {
          throw new Response("Internal Server Error", { status: 500, headers });
        }
      } else {
        throw new Error("The body's data must be an object.");
      }
    } catch (err) {
      if (err instanceof Response) {
        throw err;
      } else {
        throw new Response("Bad Request", { status: 400, headers });
      }
    }
  };
}
