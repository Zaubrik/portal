import { Context } from "../portal.ts";
import {
  ConnectConfig,
  ConnectConfigWithAuthentication,
  quotedPrintableEncode,
  SendConfig,
  SmtpClient,
} from "./deps.ts";

export { quotedPrintableEncode, SmtpClient };
export type { ConnectConfig, ConnectConfigWithAuthentication, SendConfig };
export type Options = {
  isTls?: boolean;
  headers?: Headers;
  formatter?: (obj: Record<string, unknown>) => string;
};

const client = new SmtpClient();

function isObjectWide(obj: unknown): obj is Record<string, unknown> {
  return (
    obj !== null && typeof obj === "object" && Array.isArray(obj) === false
  );
}

/** Takes `ConnectConfig`, `SendConfig` and `Options` and sends an email. */
export function send(
  connectConfig: ConnectConfig | ConnectConfigWithAuthentication,
  sendConfigOrCb: SendConfig | {
    cb: ((id: string) => SendConfig);
    idGroup: string;
  },
  { isTls = true, headers = new Headers(), formatter }: Options = {},
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
      const sendConfigWithoutBody = "idGroup" in sendConfigOrCb
        ? sendConfigOrCb.cb(
          ctx.urlPatternResult.pathname.groups[sendConfigOrCb.idGroup],
        )
        : sendConfigOrCb;
      const data = JSON.parse(body);
      if (isObjectWide(data)) {
        const sendConfig = {
          ...sendConfigWithoutBody,
          content: formatter ? formatter(data) : body,
        };
        try {
          if (isTls) {
            await client.connectTLS(connectConfig);
          } else {
            await client.connect(connectConfig);
          }
          await client.send(sendConfig);
          await client.close();
          return new Response(null, { status: 200, headers });
        } catch (_err) {
          throw new Response("Internal Server Error", { status: 500 });
        }
      } else {
        throw new Error("The data must be an object.");
      }
    } catch (err) {
      if (err instanceof Response) {
        throw err;
      } else {
        throw new Response("Bad Request", { status: 400 });
      }
    }
  };
}
