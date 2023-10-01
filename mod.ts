export * from "./functions/mod.ts";
export * from "./middlewares/mod.ts";

import { Context, createHandler, type Middleware } from "./middlewares/deps.ts";
import { fallBack, logger } from "./middlewares/mod.ts";

type Options =
  & { serveOptions?: Deno.ServeOptions & Deno.ServeTlsOptions }
  & { logFile?: Parameters<typeof logger>[0] };

/**
 * Starts a default HTTP server and handles incoming requests using
 * middlewares using `composium`.
 *
 * @param {Middleware<Context>} tryMiddleware - The middleware to be applied to incoming requests.
 * @param {Options} [options={}] - Optional configuration options for the server.
 * @example
 * ```ts
 * import { serveStatic } from "./middlewares/mod.ts";
 * serve(serveStatic("./examples/static/"));
 * ```
 */
export function serve(
  tryMiddleware: Middleware<Context>,
  options: Options = {},
) {
  const handler = createHandler(Context)(tryMiddleware)(fallBack)(
    logger(options.logFile),
  );
  return options.serveOptions
    ? Deno.serve(options.serveOptions, handler)
    : Deno.serve(handler);
}
