import { Context } from "../portal.ts";
import { join, serveFile } from "./deps.ts";

type ServeFileOptions = {
  home?: string;
  enableCors?: boolean;
  subdomainGroup?: string;
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
  { home = "index.html", enableCors = false, subdomainGroup }:
    ServeFileOptions = {},
) {
  return async (ctx: Context) => {
    if (ctx.response.ok) return ctx.response;
    const rootStr = root instanceof URL ? root.pathname : root;
    const subdomainStr = subdomainGroup
      ? ctx.urlPatternResult.hostname.groups[subdomainGroup]
        .replaceAll(".", "/")
      : "";
    const pathname = ctx.url.pathname;
    const absolutePath = join(rootStr, subdomainStr, pathname);
    const fileInfo = await Deno.stat(absolutePath);
    const filePath = fileInfo.isDirectory
      ? join(absolutePath, home)
      : absolutePath;
    const response = await serveFile(ctx.request, filePath);
    if (enableCors) setCors(response);
    return response;
  };
}
