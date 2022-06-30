import { Context } from "../portal.ts";
import {
  createHttpError,
  decodeUriComponentSafe,
  getPathname,
  isHttpError,
  isResponse,
  join,
  mergeUrl,
  serveDir,
  ServeDirOptions,
  serveFile,
  Status,
} from "./deps.ts";

type Options = ServeDirOptions & {
  checkIfNotFound?: boolean;
  subdomainGroup?: string;
  appendTrailingSlash?: boolean;
  home?: string;
};

/**
 * Takes a `URL` or a `string` as absolute path and serves the files under the
 * given directory root.
 * ```ts
 * app.get(
 *   { protocol: "http{s}?", hostname: "{:subdomain.}*localhost" },
 *   serveStatic(new URL("./static", import.meta.url))
 * );
 * ```
 */
export function serveStatic(fsRoot: URL | string, options: Options = {}) {
  const rootPathname = getPathname(fsRoot);
  options.fsRoot = rootPathname;
  options.quiet ??= true;
  return async (ctx: Context): Promise<Response> => {
    if (options.checkIfNotFound && ctx.response.status !== Status.NotFound) {
      return ctx.response;
    }
    if (options.showDirListing) {
      const subdomainPath = getSubdomainPath(ctx, options.subdomainGroup);
      try {
        if (subdomainPath) {
          const newPath = join(subdomainPath, getPathname(ctx.url));
          const url = mergeUrl(ctx.url)({ pathname: newPath });
          const newRequest = new Request(url.href, ctx.request);
          return await serveDir(newRequest, options);
        } else {
          return await serveDir(ctx.request, options);
        }
      } catch (err) {
        throw createHttpError(Status.InternalServerError, err.message);
      }
    } else {
      return await serveStaticFile(rootPathname, options)(ctx);
    }
  };
}

type ServeStaticFileOptions = {
  home?: string;
  appendTrailingSlash?: boolean;
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
export function serveStaticFile(fsRoot: string | URL, {
  home = "index.html",
  subdomainGroup,
  appendTrailingSlash = true,
}: ServeStaticFileOptions = {}) {
  return async (ctx: Context): Promise<Response> => {
    try {
      const rootPath = getPathname(fsRoot);
      const subdomainStr = getSubdomainPath(ctx, subdomainGroup);
      const pathname = getPathname(ctx.url);
      const newPath = join(rootPath, subdomainStr, pathname);
      const fileInfo = await Deno.stat(newPath);
      if (
        appendTrailingSlash && fileInfo.isDirectory &&
        newPath.slice(-1) !== "/"
      ) {
        throw Response.redirect(ctx.request.url + "/", Status.MovedPermanently);
      }
      return fileInfo.isDirectory
        ? await serveFile(ctx.request, join(newPath, home))
        : await serveFile(ctx.request, newPath, { fileInfo });
    } catch (errorOrResponse) {
      if (isResponse(errorOrResponse)) {
        return errorOrResponse;
      } else {
        throw isHttpError(errorOrResponse)
          ? errorOrResponse
          : createHttpError(Status.NotFound);
      }
    }
  };
}

function getSubdomainPath(ctx: Context, subdomainGroup?: string): string {
  try {
    if (!subdomainGroup) return "";
    const subdomainGroupResult = decodeUriComponentSafe(
      ctx.params.hostname.groups[subdomainGroup].replaceAll(".", "/"),
    );
    return subdomainGroupResult.replaceAll(".", "/");
  } catch (err) {
    throw createHttpError(Status.InternalServerError, err.message);
  }
}
