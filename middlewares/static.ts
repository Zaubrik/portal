import {
  type Context,
  createHttpError,
  isErrorStatus,
  isHttpError,
  isString,
  join,
  serveFile,
  Status,
} from "./deps.ts";
import { getSubdomainPath } from "./subdomain.ts";
import { getPathnameFs, resolveMainModule } from "../functions/path.ts";
import { decodeUriComponentSafely } from "../functions/url.ts";

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
 *   serveStatic(./static), {
 *     hasSubdomainDirectory: true,
 *     urlRoot: "first",
 *   }),
 * );
 * ```
 */
export function serveStatic(fsRoot: string | URL = "./static", {
  home = "index.html",
  hasSubdomainDirectory = false,
  appendTrailingSlash = true,
  urlRoot = "",
}: ServeStaticFileOptions = {}) {
  const pathRoot = isString(fsRoot) && fsRoot.startsWith("./")
    ? resolveMainModule(fsRoot)
    : getPathnameFs(fsRoot);
  const urlRootToBeRemoved = join("/", urlRoot);
  return async <C extends Context>(ctx: C): Promise<C> => {
    try {
      const subdomainStr = hasSubdomainDirectory ? getSubdomainPath(ctx) : "";
      const pathname = decodeUriComponentSafely(ctx.url.pathname);
      const newPath = join(
        pathRoot,
        subdomainStr,
        urlRoot.length && pathname.startsWith(urlRootToBeRemoved)
          ? pathname.replace(urlRootToBeRemoved, "")
          : pathname,
      );
      const fileInfo = await Deno.stat(newPath);
      if (
        appendTrailingSlash && fileInfo.isDirectory &&
        !newPath.endsWith(Deno.build.os === "windows" ? "\\" : "/")
      ) {
        ctx.response = new Response(null, {
          status: Status.MovedPermanently,
          // Relative path: https://stackoverflow.com/questions/8250259/is-a-302-redirect-to-relative-url-valid-or-invalid
          headers: { "location": ctx.url.pathname + "/" },
        });
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
      if (fileInfo.isFile || fileInfo.isSymlink) {
        ctx.response.headers.set("X-Disk-Size-Used", `${fileInfo.size}`);
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
