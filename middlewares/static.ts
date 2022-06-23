import { Context } from "../portal.ts";
import {
  createHttpError,
  getPathname,
  isResponse,
  join,
  serveFile,
  Status,
} from "./deps.ts";

type ServeFileOptions = {
  home?: string;
  appendTrailingSlash?: boolean;
  checkIfNotFound?: boolean;
  subdomainGroup?: string;
};

/**
 * Takes a `URL` or a `string` as absolute path and returns a `Handler` which
 * returns a `Response` with the static file, throws an `HttpError` or throws a
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
    checkIfNotFound = true,
    subdomainGroup,
  }: ServeFileOptions = {},
) {
  const rootPath = getPathname(root);
  return async (ctx: Context) => {
    if (checkIfNotFound && ctx.response.status !== Status.NotFound) return;
    try {
      const pathname = decodeURIComponent(ctx.url.pathname);
      const subdomainStr = subdomainGroup
        ? ctx.urlPatternResult.hostname.groups[subdomainGroup]
          .replaceAll(".", "/")
        : "";
      const absolutePath = join(rootPath, subdomainStr, pathname);
      const fileInfo = await Deno.stat(absolutePath);
      if (
        appendTrailingSlash && fileInfo.isDirectory &&
        absolutePath.slice(-1) !== "/"
      ) {
        throw Response.redirect(ctx.request.url + "/", Status.MovedPermanently);
      }
      return fileInfo.isDirectory
        ? await serveFile(ctx.request, join(absolutePath, home))
        : await serveFile(ctx.request, absolutePath, { fileInfo });
    } catch (errorOrResponse) {
      throw isResponse(errorOrResponse)
        ? errorOrResponse
        : createHttpError(Status.NotFound);
    }
  };
}
