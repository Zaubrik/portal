import { Context } from "../portal.ts";
import { join, serveFile } from "./deps.ts";

/**
 * A minimal static file server middleware.
 */

type ServeFileOptions = {
  home?: string;
  enableCors?: boolean;
  subdomain?: string;
};

function setCors(res: Response): void {
  res.headers.append("access-control-allow-origin", "*");
  res.headers.append(
    "access-control-allow-headers",
    "Origin, X-Requested-With, Content-Type, Accept, Range",
  );
}

/**
 * Takes a `URL` or a `string` as absolute path and returns a handler function
 * which returns a `Response` containing the static file or throws an `Error`.
 * ```ts
 * app.get(
 *   { protocol: "http{s}?", hostname: "{:subdomain.}*localhost" },
 *   serveStatic(new URL("./static", import.meta.url), {
 *     subdomain: "subdomain",
 *   }),
 * );
 * ```
 */
export function serveStatic(
  root: URL | string,
  { home = "index.html", enableCors = false, subdomain }: ServeFileOptions = {},
) {
  return async (ctx: Context) => {
    if (ctx.response.ok) return ctx.response;
    const subdomainStr = subdomain
      ? (ctx.urlPatternResult.hostname.groups[subdomain] ?? "")
        .replace(".", "/")
      : "";
    const pathname = ctx.url.pathname[ctx.url.pathname.length - 1] === "/"
      ? ctx.url.pathname + home
      : ctx.url.pathname;
    const absolutePath = join(
      root instanceof URL ? root.pathname : root,
      subdomainStr,
      pathname,
    );
    const response = await serveFile(ctx.request, absolutePath);
    if (enableCors) setCors(response);
    return response;
  };
}
