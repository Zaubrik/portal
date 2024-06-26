import {
  type Context,
  dirname,
  isAbsolute,
  isPresent,
  isUrl,
  join,
  queue,
} from "./deps.ts";
import { getPathnameFs, resolveMainModule } from "../functions/path.ts";

function createLog<C extends Context>(ctx: C) {
  return {
    request: {
      hostname: ctx.request.headers.get("X-Real-IP") ||
        ctx.connInfo.remoteAddr.hostname,
      method: ctx.request.method,
      url: ctx.request.url,
      date: new Date().toISOString(),
      referer: ctx.request.headers.get("Referer"),
    },
    status: ctx.response.status,
    length: ctx.response.headers.get("Content-Length"),
    responseHeaders: {
      xResponseTime: `${Date.now() - ctx.startTime}ms`,
      contentType: ctx.response.headers.get("Content-Type"),
    },
    error: isPresent(ctx.error) ? ctx.error.message : null,
    sub: isPresent(ctx.state.payload?.sub) ? ctx.state.payload.sub : null,
  };
}

function logWithOptions(path: string, options: LoggerOptions) {
  Deno.mkdirSync(dirname(path), { recursive: true });
  return async ({ logObject, error }: {
    logObject: Record<string, unknown>;
    error: Context["error"];
  }) => {
    if (options.debug && isPresent(error)) {
      console.error(error);
    }
    if (options.print) {
      console.log(JSON.stringify(logObject, null, 2));
    }
    if (options.file) {
      await Deno.writeTextFile(path, JSON.stringify(logObject) + "\n", {
        append: true,
      });
    }
    return logObject;
  };
}

export type LoggerOptions = {
  print?: boolean;
  file?: boolean;
  debug?: boolean;
};
/**
 * Takes a `LogConfig` or path and logs data depending on the status and error.
 * ```ts
 * all(logger("./.log/access.log"));
 * ```
 */
export function logger(
  path: string | URL = "access.log",
  { print = true, file = true, debug = false }: LoggerOptions = {},
) {
  const absolutePath = isUrl(path) || isAbsolute(path)
    ? getPathnameFs(path)
    : resolveMainModule("./" + join(".log/", path));
  const log = logWithOptions(absolutePath, { print, file, debug });
  const generator = queue(log);
  return <C extends Context>(ctx: C): C => {
    const logObject = createLog(ctx);
    generator.next({ logObject, error: ctx.error });
    return ctx;
  };
}

export function logCtx(property?: keyof Context) {
  return <C extends Context>(ctx: C): C => {
    const value = property ? ctx[property] : ctx;
    const prefix = property ? `ctx["${property}"]:` : "ctx:";
    console.log(prefix, value);
    return ctx;
  };
}
