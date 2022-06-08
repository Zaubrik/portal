import { Context } from "../portal.ts";

/**
 * Fetches a `Response` from another port.
 * ```ts
 * app.get({ pathname: "/extern" }, changePort("3000"));
 * ```
 */

function changePort(newPort: string) {
  return async (ctx: Context) => {
    const url = new URL(ctx.request.url);
    url.port = newPort;
    const newReq = new Request(url.href, ctx.request);
    return await fetch(newReq);
  };
}
