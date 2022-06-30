import { Context } from "../portal.ts";
import {
  ensureFile,
  getPathname,
  isClientErrorStatus,
  isHttpError,
  isInformationalStatus,
  isNotNull,
  isServerErrorStatus,
  isString,
  isUrl,
  log,
  LogConfig,
} from "./deps.ts";

async function getConfig(configOrUrlToLogFile: LogConfig | string | URL) {
  if (isString(configOrUrlToLogFile) || isUrl(configOrUrlToLogFile)) {
    const pathname = getPathname(configOrUrlToLogFile);
    await ensureFile(pathname);
    return {
      handlers: {
        console: new log.handlers.ConsoleHandler("DEBUG", {
          formatter: "{msg}",
        }),

        file: new log.handlers.FileHandler("INFO", {
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
  return (ctx: Context): Response => {
    if (isNotNull(ctx.error) && !isHttpError(ctx.error)) {
      logger.critical(createMessage(ctx));
    } else if (isServerErrorStatus(ctx.response.status)) {
      logger.error(createMessage(ctx));
    } else if (isClientErrorStatus(ctx.response.status)) {
      logger.warning(createMessage(ctx));
    } else if (isInformationalStatus(ctx.response.status)) {
      logger.info(createMessage(ctx));
    } else if (isDebug) {
      logger.debug(createMessage(ctx));
    }
    return ctx.response;
  };
}
