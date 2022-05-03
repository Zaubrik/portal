import { Context } from "../portal.ts";
import { ClientOptions, SendConfig, SMTPClient } from "./deps.ts";

type Options = { isDryRun?: boolean };

function isObjectWide(obj: unknown): obj is Record<string, unknown> {
  return (
    obj !== null && typeof obj === "object" && Array.isArray(obj) === false
  );
}

/**
 * Takes `ClientOptions` and `SendConfig` or a callback Config, sends an email
 * with SMTP and returns or throws a `Response`.
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
          throw new Response("Internal Server Error", { status: 500 });
        }
      } else {
        throw new Error("The body's data must be an object.");
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
