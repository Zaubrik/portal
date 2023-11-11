import { type Context, isAbsolute, isPresent, isUrl, join } from "./deps.ts";
import { getPathnameFs, resolveMainModule } from "../functions/path.ts";

function createLog<C extends Context>(ctx: C) {
  return {
    request: {
      hostname: ctx.request.headers.get("X-Real-IP") ||
        ctx.connInfo.remoteAddr.hostname,
      method: ctx.request.method,
      url: ctx.request.url,
      date: new Date().toISOString(),
      headers: {
        userAgent: ctx.request.headers.get("User-Agent"),
        referer: ctx.request.headers.get("Referer"),
      },
    },
    status: ctx.response.status,
    length: ctx.response.headers.get("Content-Length"),
    responseHeaders: {
      xResponseTime: `${Date.now() - ctx.startTime}ms`,
      contentType: ctx.response.headers.get("Content-Type"),
    },
    error: isPresent(ctx.error) ? ctx.error.message : null,
    user: isPresent(ctx.state.payload?.sub) ? ctx.state.payload.sub : null,
  };
}

export function queue(f: any) {
  async function* makeGenerator(): any {
    let passedValue: any;
    let result: any;
    let i = 0;
    while (true) {
      passedValue = yield result as any;
      result = await f(passedValue, i) as any;
      i++;
    }
  }
  const generator = makeGenerator();
  generator.next();
  return generator;
}

function logWithOptions(path: string, options: LoggerOptions) {
  return async <C extends Context>(ctx: C) => {
    const message = JSON.stringify(createLog(ctx));
    if (options.print) {
      console.log(message);
    }
    if (options.file) {
      await Deno.writeTextFile(path, message + "\n", { append: true });
    }
    if (options.debug && isPresent(ctx.error)) {
      console.error(ctx.error);
    }
    return message;
  };
}

type LoggerOptions = {
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
  url: string | URL = "access.log",
  { print = true, file = true, debug = false }: LoggerOptions = {},
) {
  const path = isUrl(url) || isAbsolute(url)
    ? getPathnameFs(url)
    : resolveMainModule("./" + join(".log/", url));
  const log = logWithOptions(path, { print, file, debug });
  const generator = queue(log);
  return async <C extends Context>(ctx: C): Promise<C> => {
    await generator.next(ctx);
    return ctx;
  };
}
