import {
  Context,
  createHttpError,
  decodeUriComponentSafely,
  isHttpError,
  isResponse,
  join,
  mergeUrl,
  serveDir,
  ServeDirOptions,
  serveFile,
  Status,
} from "../deps.ts";
import { getPathnameFs } from "../util/mod.ts";

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
 *   serveStatic(new URL("./static", import.meta.url), {showDirListing: true})
 * );
 * ```
 */
export function serveStatic(fsRoot: URL | string, options: Options = {}) {
  const rootPathname = getPathnameFs(fsRoot);
  options.fsRoot = rootPathname;
  options.quiet ??= true;
  return async <C extends Context>(ctx: C): Promise<C> => {
    if (options.checkIfNotFound && ctx.response.status !== Status.NotFound) {
      return ctx;
    }
    if (options.showDirListing) {
      const subdomainPath = getSubdomainPath(ctx, options.subdomainGroup);
      try {
        if (subdomainPath) {
          const newPath = join(subdomainPath, getPathnameFs(ctx.url));
          const url = mergeUrl(ctx.url)({ pathname: newPath });
          const newRequest = new Request(url.href, ctx.request);
          ctx.response = await serveDir(newRequest, options);
          return ctx;
        } else {
          ctx.response = await serveDir(ctx.request, options);
          return ctx;
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
 *     subdomainGroup: "subdomain",
 *     fsRoot: "./static",
 *     urlRoot: "first",
 *   }),
 * );
 * ```
 */
export function serveStaticFile(fsRoot: string | URL, {
  home = "index.html",
  subdomainGroup,
  appendTrailingSlash = true,
  urlRoot = "",
}: ServeStaticFileOptions = {}) {
  const rootPath = getPathnameFs(fsRoot);
  return async <C extends Context>(ctx: C): Promise<C> => {
    try {
      const subdomainStr = getSubdomainPath(ctx, subdomainGroup);
      const pathname = getPathnameFs(ctx.url);
      const newPath = join(
        rootPath,
        subdomainStr,
        pathname.startsWith("/" + urlRoot)
          ? pathname.replace("/" + urlRoot, "")
          : pathname,
      );
      const fileInfo = await Deno.stat(newPath);
      if (
        appendTrailingSlash && fileInfo.isDirectory &&
        newPath.slice(-1) !== "/"
      ) {
        throw Response.redirect(ctx.request.url + "/", Status.MovedPermanently);
      }
      const filePath = fileInfo.isDirectory ? join(newPath, home) : newPath;
      ctx.response = fileInfo.isDirectory
        ? await serveFile(ctx.request, filePath)
        : await serveFile(ctx.request, filePath, { fileInfo });
      return ctx;
    } catch (errorOrResponse) {
      if (isResponse(errorOrResponse)) {
        ctx.response = errorOrResponse;
        return ctx;
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
    const subdomainGroupResult = decodeUriComponentSafely(
      ctx.params.hostname.groups[subdomainGroup].replaceAll(".", "/"),
    );
    return subdomainGroupResult.replaceAll(".", "/");
  } catch (err) {
    throw createHttpError(Status.InternalServerError, err.message);
  }
}
