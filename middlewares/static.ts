import {
  type Context,
  createHttpError,
  isErrorStatus,
  isHttpError,
  join,
  serveFile,
  Status,
} from "./deps.ts";
import { getSubdomainPath } from "./subdomain.ts";
import { getPathnameFs } from "../functions/path.ts";
import { decodeUriComponentSafely } from "../functions/url.ts";

type ServeStaticFileOptions = {
  home?: string;
  appendTrailingSlash?: boolean;
  hasSubdomainDirectory?: boolean;
  urlRoot?: string;
  enableCors?: boolean;
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
  enableCors = false,
}: ServeStaticFileOptions = {}) {
  const pathRoot = getPathnameFs(new URL(fsRoot, Deno.mainModule));
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
        appendTrailingSlash && fileInfo.isDirectory && !newPath.endsWith("/")
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
      ctx.response = response;
      if (enableCors) {
        ctx.response.headers.set("access-control-allow-origin", "*");
      }
      return ctx;
    } catch (error) {
      throw isHttpError(error)
        ? enableCors
          ? createHttpError(error.status, error.message, {
            expose: false,
            headers: new Headers({ "access-control-allow-origin": "*" }),
          })
          : error
        : enableCors
        ? createHttpError(Status.NotFound, error.message, {
          expose: false,
          headers: new Headers({ "access-control-allow-origin": "*" }),
        })
        : createHttpError(Status.NotFound, error.message, { expose: false });
    }
  };
}
