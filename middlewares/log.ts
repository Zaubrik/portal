import {
  Context,
  ensureFile,
  isPresent,
  isString,
  isUrl,
  log,
  LogConfig,
  Logger,
} from "../deps.ts";
import { getPathnameFs } from "../util/mod.ts";

async function getDefaultConfig(pathToLogFile: string | URL) {
  const pathname = getPathnameFs(pathToLogFile);
  await ensureFile(pathname);
  return {
    handlers: {
      console: new log.handlers.ConsoleHandler("DEBUG", {
        formatter: "{msg}",
      }),

      file: new log.handlers.FileHandler("DEBUG", {
        filename: pathname,
        formatter: (logRecord) => {
          return JSON.stringify({
            timestamp: logRecord.datetime.toISOString(),
            ...JSON.parse(logRecord.msg),
            logger: logRecord.loggerName,
            level: logRecord.levelName,
          });
        },
      }),
    },
    loggers: {
      default: {
        level: "DEBUG" as const,
        handlers: ["console", "file"],
      },
    },
  };
}

async function logMessage<C extends Context>(
  ctx: C,
  logger: Logger,
  isDevelopment: boolean,
): Promise<void> {
  try {
    if (isDevelopment) {
      console.log(
        `${ctx.request.method} ${ctx.request.url} [${ctx.response.status}]`,
      );
      if (ctx.error !== null) {
        console.log(ctx.error);
      }
    } else {
      const message = await createMessage(ctx);
      logger.debug(message);
    }
  } catch (error) {
    console.error(`Unexpected logger error: ${error?.message}`);
  }
}

async function getConfig(configOrUrlToLogFile: LogConfig | string | URL) {
  if (isString(configOrUrlToLogFile) || isUrl(configOrUrlToLogFile)) {
    return await getDefaultConfig(configOrUrlToLogFile);
  } else {
    return configOrUrlToLogFile;
  }
}

async function createMessage<C extends Context>(ctx: C): Promise<string> {
  return JSON.stringify(
    {
      request: {
        hostname: "hostname" in ctx.connInfo.remoteAddr
          ? ctx.connInfo.remoteAddr.hostname
          : ctx.connInfo.remoteAddr.path,
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
        xResponseTime: ctx.response.headers.get("X-Response-Time"),
        contentType: ctx.response.headers.get("Content-Type"),
      },
      message: isPresent(ctx.error) ? ctx.error.message : null,
      user: isPresent(ctx.state.payload?.sub) ? ctx.state.payload.sub : null,
    },
  );
}

/**
 * Takes a `LogConfig` or `URL` and logs data depending on the status and error.
 * ```ts
 * all(await logger(new URL("./logs/log.txt", import.meta.url)));
 * ```
 */
export async function logger(
  configOrUrlToLogFile: LogConfig | string | URL,
  isDevelopment = true,
) {
  await log.setup(await getConfig(configOrUrlToLogFile));
  const logger = log.getLogger();
  return <C extends Context>(ctx: C): C => {
    logMessage(ctx, logger, isDevelopment);
    return ctx;
  };
}
