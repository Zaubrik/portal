import { Context } from "../portal.ts";
import { getPathname, serveDir, ServeDirOptions } from "./deps.ts";

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
export function serveStatic(
  fsRoot: URL | string,
  options?: ServeDirOptions & { checkIfNotFound?: boolean } = {},
) {
  options.fsRoot = getPathname(fsRoot);
  options.quiet ??= true;
  return async (ctx: Context) => {
    if (options.checkIfNotFound && ctx.response.status !== Status.NotFound) {
      return;
    }
    return await serveDir(ctx.request, options);
  };
}
