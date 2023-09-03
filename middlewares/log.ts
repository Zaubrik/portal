import {
  assertError,
  type Context,
  ensureFileSync,
  isAbsolute,
  isPresent,
  isString,
  isUrl,
  join,
  log,
  type LogConfig,
  type Logger,
} from "./deps.ts";
import { getPathnameFs, resolveMainModule } from "../functions/path.ts";

function getDefaultConfig(path: string) {
  return {
    handlers: {
      console: new log.handlers.ConsoleHandler("DEBUG", {
        formatter: (logRecord) => {
          return logRecord.msg;
        },
      }),

      file: new log.handlers.FileHandler("DEBUG", {
        filename: path,
        formatter: (logRecord) => {
          return logRecord.msg;
        },
      }),
    },
    loggers: {
      console: {
        level: "DEBUG" as const,
        handlers: ["console"],
      },
      file: {
        level: "DEBUG" as const,
        handlers: ["file"],
      },
      all: {
        level: "DEBUG" as const,
        handlers: ["console", "file"],
      },
    },
  };
}

function logMessage<C extends Context>(
  ctx: C,
  logger: Logger,
): void {
  try {
    logger.debug(createMessage(ctx));
  } catch (error) {
    console.error(`Unexpected logger error: ${assertError(error).message}`);
  }
}

function getConfig(configOrUrlToLogFile: LogConfig | string | URL) {
  if (isString(configOrUrlToLogFile) || isUrl(configOrUrlToLogFile)) {
    const pathname =
      isUrl(configOrUrlToLogFile) || isAbsolute(configOrUrlToLogFile)
        ? getPathnameFs(configOrUrlToLogFile)
        : resolveMainModule("./" + join(".log/", configOrUrlToLogFile));
    const defaultConfig = getDefaultConfig(pathname);
    ensureFileSync(pathname);
    return defaultConfig;
  } else {
    return configOrUrlToLogFile;
  }
}

function createMessage<C extends Context>(ctx: C) {
  return {
    request: {
      hostname: ctx.connInfo.remoteAddr.hostname,
      method: ctx.request.method,
      url: ctx.request.url,
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
    message: isPresent(ctx.error) ? ctx.error.message : null,
    user: isPresent(ctx.state.payload?.sub) ? ctx.state.payload.sub : null,
  };
}

/**
 * Takes a `LogConfig` or path and logs data depending on the status and error.
 * ```ts
 * all(logger("./.log/access.log"));
 * ```
 */
export function logger(
  configOrUrlToLogFile: LogConfig | string | URL = "access.log",
  kind: "console" | "file" | "all" = "all",
) {
  /**await*/ log.setup(getConfig(configOrUrlToLogFile));
  const logger = log.getLogger(kind);
  return <C extends Context>(ctx: C): C => {
    logMessage(ctx, logger);
    return ctx;
  };
}

export function logError<C extends Context>(ctx: C): C {
  console.log(ctx.error);
  return ctx;
}
