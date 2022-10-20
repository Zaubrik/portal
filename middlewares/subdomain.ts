import {
  Context,
  createHttpError,
  decodeUriComponentSafely,
  Status,
} from "../deps.ts";

/**
 * Removes the subdomain `www.` and redirects with status `301`.
 * ```ts
 * get({ hostname: "www.*" })(wwwRedirect);
 * ```
 */
export function wwwRedirect<C extends Context>(ctx: C): C {
  ctx.response = new Response(null, {
    status: Status.MovedPermanently,
    headers: { "location": ctx.request.url.replace("www.", "") },
  });

  return ctx;
}

/**
 * Get a pathname combined by the subdomain(s) and the original pathname. Throws
 * an error if there is no `subdomain` group on `ctx.params.hostname.groups`.
 */
export function getSubdomainPath(ctx: Context): string {
  try {
    const { subdomain } = ctx.params.hostname.groups;
    if (!subdomain) {
      throw new Error("No valid hostname params.");
    }
    const subdomainDirectoryResult = decodeUriComponentSafely(subdomain)
      .replaceAll(".", "/");
    return subdomainDirectoryResult;
  } catch (error) {
    throw createHttpError(Status.InternalServerError, error.message);
  }
}
