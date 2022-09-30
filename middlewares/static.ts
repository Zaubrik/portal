import {
  Context,
  createHttpError,
  isErrorStatus,
  isHttpError,
  isResponse,
  join,
  mergeUrl,
  serveFile,
  Status,
} from "../deps.ts";
import { getSubdomainPath } from "./subdomain.ts";
import { getPathnameFs } from "../util/mod.ts";

type ServeStaticFileOptions = {
  home?: string;
  appendTrailingSlash?: boolean;
  hasSubdomainDirectory?: boolean;
  urlRoot?: string;
};

/**
 * Takes a `URL` or a `string` as absolute path and returns a `Handler` which
 * returns a `Response` with the static file, throws an `HttpError` or throws a
 * Response (if the resource is a directory and has no trailing `/`).
 * ```ts
 * app.get(
 *   { protocol: "http{s}?", hostname: "{:subdomain.}*localhost" },
 *   serveStatic(new URL("./static", import.meta.url), {
 *     hasSubdomainDirectory: true,
 *     fsRoot: "./static",
 *     urlRoot: "first",
 *   }),
 * );
 * ```
 */
export function serveStatic(fsRoot: string | URL, {
  home = "index.html",
  hasSubdomainDirectory = false,
  appendTrailingSlash = true,
  urlRoot = "",
}: ServeStaticFileOptions = {}) {
  const pathRoot = getPathnameFs(fsRoot);
  const urlRootToBeRemoved = join("/", urlRoot);
  return async <C extends Context>(ctx: C): Promise<C> => {
    try {
      const subdomainStr = hasSubdomainDirectory ? getSubdomainPath(ctx) : "";
      const pathname = getPathnameFs(ctx.url);
      const newPath = join(
        pathRoot,
        subdomainStr,
        urlRoot.length && pathname.startsWith(urlRootToBeRemoved)
          ? pathname.replace(urlRootToBeRemoved, "")
          : pathname,
      );
      const fileInfo = await Deno.stat(newPath);
      if (
        appendTrailingSlash && fileInfo.isDirectory && !newPath.endsWith("/")
      ) {
        ctx.response = Response.redirect(
          ctx.request.url + "/",
          Status.MovedPermanently,
        );
        return ctx;
      }
      const filePath = fileInfo.isDirectory ? join(newPath, home) : newPath;
      const response = fileInfo.isDirectory
        ? await serveFile(ctx.request, filePath)
        : await serveFile(ctx.request, filePath, { fileInfo });
      if (isErrorStatus(response.status)) {
        throw createHttpError(response.status, response.statusText, {
          expose: false,
        });
      }
      ctx.response = response;
      return ctx;
    } catch (error) {
      throw isHttpError(error)
        ? error
        : createHttpError(Status.NotFound, error.message, { expose: false });
    }
  };
}
