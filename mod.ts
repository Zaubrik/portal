export * from "./functions/mod.ts";
export * from "./middlewares/mod.ts";

import {
  Context,
  createHandler,
  type Middleware,
  type ServerHandlerOptions,
} from "./middlewares/deps.ts";
import { fallBack, logger, type LoggerOptions } from "./middlewares/mod.ts";
import { resolveMainModule } from "./functions/path.ts";

export type DefaultHandlerOptions =
  // deno-lint-ignore no-explicit-any
  & { handlerOptions?: ServerHandlerOptions<Record<string, any>> }
  & { loggerOptions?: LoggerOptions }
  & { hostname: string };

/**
 * Starts a default HTTP server and handles incoming requests using
 * middlewares using `composium`.
 *
 * @param {Middleware<Context>} tryMiddleware - The middleware to be applied to incoming requests.
 * @param {Options} [options={}] - Optional configuration options for the server.
 * @example
 * ```ts
 * import { serveStatic } from "./middlewares/mod.ts";
 * createDefaultHandler(serveStatic("./examples/static/"), { hostname: "zaurbik.de" });
 * ```
 */
export function createDefaultHandler(
  tryMiddleware: Middleware<Context>,
  options: DefaultHandlerOptions,
) {
  const pid = {
    path: resolveMainModule("./.pid"),
    name: options.hostname,
    append: true,
    ...options.handlerOptions?.pid,
  };
  const handlerOptions = { ...options.handlerOptions, pid };
  const loggerOptions = { debug: true, ...options.loggerOptions };

  const handler = createHandler(Context, handlerOptions)(tryMiddleware)(
    fallBack,
  )(
    logger(options.hostname, loggerOptions),
  );
  return handler;
}
