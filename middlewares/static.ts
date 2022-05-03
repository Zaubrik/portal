import { Context } from "../portal.ts";
import { fromFileUrl, join, serveFile } from "./deps.ts";

type ServeFileOptions = {
  home?: string;
  appendTrailingSlash?: boolean;
  subdomainGroup?: string;
};

/**
 * Takes a `URL` or a `string` as absolute path and returns a `Handler` which
 * returns a `Response` with the static file, throws an `Error` or throws a
 * Response (if the resource is a directory and has no trailing `/`).
 * ```ts
 * app.get(
 *   { protocol: "http{s}?", hostname: "{:subdomain.}*localhost" },
 *   serveStatic(new URL("./static", import.meta.url), {
 *     subdomainGroup: "subdomain",
 *   }),
 * );
 * ```
 */
export function serveStatic(
  root: URL | string,
  {
    home = "index.html",
    appendTrailingSlash = true,
    subdomainGroup,
  }: ServeFileOptions = {},
) {
  const rootStr = root instanceof URL ? fromFileUrl(root) : root;
  return async (ctx: Context) => {
    if (ctx.response.ok) return ctx.response;
    const pathname = decodeURIComponent(ctx.url.pathname);
    const subdomainStr = subdomainGroup
      ? ctx.urlPatternResult.hostname.groups[subdomainGroup]
        .replaceAll(".", "/")
      : "";
    const absolutePath = join(rootStr, subdomainStr, pathname);
    const fileInfo = await Deno.stat(absolutePath);
    if (
      appendTrailingSlash && fileInfo.isDirectory &&
      absolutePath.slice(-1) !== "/"
    ) {
      throw Response.redirect(ctx.request.url + "/", 301);
    }
    const filePath = fileInfo.isDirectory
      ? join(absolutePath, home)
      : absolutePath;
    const response = await serveFile(ctx.request, filePath);
    return response;
  };
}
