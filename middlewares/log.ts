import { Context } from "../portal.ts";
import { ensureFile, fromFileUrl, log, LogConfig } from "./deps.ts";

async function getConfig(configOrUrlToLogFile: LogConfig | string | URL) {
  if (
    typeof configOrUrlToLogFile === "string" ||
    configOrUrlToLogFile instanceof URL
  ) {
    const pathname = configOrUrlToLogFile instanceof URL
      ? fromFileUrl(configOrUrlToLogFile)
      : configOrUrlToLogFile;
    await ensureFile(pathname);
    return {
      handlers: {
        console: new log.handlers.ConsoleHandler("DEBUG", {
          formatter: "{msg}",
        }),

        file: new log.handlers.FileHandler("WARNING", {
          filename: pathname,
          formatter: (logRecord) => {
            const d = logRecord.datetime.toISOString();
            const dateFmt = `${d.slice(0, 10)} ${d.slice(11, 19)}`;
            return `${
              JSON.stringify({
                levelName: logRecord.levelName,
                msg: JSON.parse(logRecord.msg),
                date: dateFmt,
                loggerName: logRecord.loggerName,
              })
            },`;
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
  } else {
    return configOrUrlToLogFile;
  }
}

function isBetween(x: number, min: number, max: number) {
  return x >= min && x <= max;
}

function createMessage(ctx: Context) {
  return JSON.stringify(
    {
      status: ctx.response.status,
      url: ctx.request.url,
      error: ctx.error === null ? null : ctx.error.stack,
    },
  );
}

/**
 * Takes a `LogConfig` or `URL` and logs data depending on the status and error.
 * ```ts
 * app.finally(await logger(new URL("./logs/log.txt", import.meta.url)));
 * ```
 */
export async function logger(
  configOrUrlToLogFile: LogConfig | string | URL,
  isDebug = true,
) {
  await log.setup(await getConfig(configOrUrlToLogFile));
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
