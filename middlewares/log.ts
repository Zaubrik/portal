import {
  assertError,
  type Context,
  ensureFileSync,
  isPresent,
  isString,
  isUrl,
  log,
  type LogConfig,
  type Logger,
} from "./deps.ts";
import { getPathnameFs } from "../functions/path.ts";

function getDefaultConfig(pathToLogFile: string | URL) {
  const pathname = getPathnameFs(new URL(pathToLogFile, Deno.mainModule));
  ensureFileSync(pathname);
  return {
    handlers: {
      console: new log.handlers.ConsoleHandler("DEBUG", {
        formatter: (logRecord) => {
          return logRecord.msg;
        },
      }),

      file: new log.handlers.FileHandler("DEBUG", {
        filename: pathname,
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

async function logMessage<C extends Context>(
  ctx: C,
  logger: Logger,
): Promise<void> {
  try {
    logger.debug(await createMessage(ctx));
  } catch (error) {
    console.error(`Unexpected logger error: ${assertError(error).message}`);
  }
}

function getConfig(configOrUrlToLogFile: LogConfig | string | URL) {
  if (isString(configOrUrlToLogFile) || isUrl(configOrUrlToLogFile)) {
    return getDefaultConfig(configOrUrlToLogFile);
  } else {
    return configOrUrlToLogFile;
  }
}

async function createMessage<C extends Context>(ctx: C) {
  console.log("ctx.connInfo.remoteAddr", ctx.connInfo.remoteAddr);
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
    length: (await ctx.response.clone().arrayBuffer()).byteLength,
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
  configOrUrlToLogFile: LogConfig | string | URL,
  kind: "console" | "file" | "all" = "all",
) {
  /**await*/ log.setup(getConfig(configOrUrlToLogFile));
  const logger = log.getLogger(kind);
  return <C extends Context>(ctx: C): C => {
    logMessage(ctx, logger);
    return ctx;
  };
}
