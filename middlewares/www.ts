import { Context } from "../portal.ts";
import { Status } from "../deps.ts";

/**
 * Removes "www." and returns a `Response` with status `301`.
 * ```ts
 * app.get({ hostname: "www.*" }, wwwRedirect);
 * ```
 */
export function wwwRedirect(ctx: Context): Response {
  return Response.redirect(
    ctx.request.url.replace("www.", ""),
    Status.MovedPermanently,
  );
}
