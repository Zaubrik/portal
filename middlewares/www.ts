import { Context } from "../portal.ts";
import { Status } from "../deps.ts";

/**
 * Removes "www." and redirects by throwing a `Response` with status `301`.
 * ```ts
 * app.get({ hostname: "www.*" }, wwwRedirect);
 * ```
 */
export function wwwRedirect(ctx: Context) {
  throw Response.redirect(
    ctx.request.url.replace("www.", ""),
    Status.MovedPermanently,
  );
}
