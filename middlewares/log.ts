import { Context } from "../portal.ts";
import { log, LogConfig } from "./deps.ts";

function getConfig(configOrUrlToLogFile: LogConfig | string | URL) {
  return typeof configOrUrlToLogFile === "string" ||
      configOrUrlToLogFile instanceof URL
    ? {
      handlers: {
        console: new log.handlers.ConsoleHandler("DEBUG", {
          formatter: "{msg}",
        }),

        file: new log.handlers.FileHandler("WARNING", {
          filename: configOrUrlToLogFile instanceof URL
            ? configOrUrlToLogFile.href
            : configOrUrlToLogFile,
          formatter: (logRecord) => {
            const d = logRecord.datetime.toISOString();
            const dateFmt = `${d.slice(0, 10)} ${d.slice(11, 19)}`;
            return JSON.stringify({
              levelName: logRecord.levelName,
              msg: logRecord.msg,
              date: dateFmt,
              loggerName: logRecord.loggerName,
            });
          },
        }),
      },
      loggers: {
        // configure default logger available via short-hand methods above.
        default: {
          level: "DEBUG" as const,
          handlers: ["console", "file"],
        },
      },
    }
    : configOrUrlToLogFile;
}

function isBetween(x: number, min: number, max: number) {
  return x >= min && x <= max;
}

function createMessage(ctx: Context) {
  return JSON.stringify({
    url: ctx.request.url,
    error: ctx.error,
    status: ctx.response.status,
  });
}

/**
 * Takes a `LogConfig` and logs information about the request or error depending
 * on the status code and error.
 */
export async function logger(
  configOrUrlToLogFile: LogConfig | string | URL,
  isDebug = true,
) {
  await log.setup(getConfig(configOrUrlToLogFile));
  const logger = log.getLogger();
  return (ctx: Context): Promise<void> => {
    if (!ctx.response.ok && isBetween(ctx.response.status, 500, 599)) {
      logger.critical(createMessage(ctx));
    } else if (ctx.error) {
      logger.error(createMessage(ctx));
    } else if (isDebug) {
      logger.debug(createMessage(ctx));
    }
  };
}
