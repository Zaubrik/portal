import { Context, Status } from "../deps.ts";

/**
 * Removes the subdomain `www.` and redirects with status `301`.
 * ```ts
 * get({ hostname: "www.*" })(wwwRedirect);
 * ```
 */
export function wwwRedirect<C extends Context>(ctx: C): C {
  ctx.response = Response.redirect(
    ctx.request.url.replace("www.", ""),
    Status.MovedPermanently,
  );
  return ctx;
}
