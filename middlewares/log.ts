import { Context } from "../portal.ts";

export interface LoggerConfig {
  formatter: (ctx: Context) => string;
  output: { rid: number };
}

const defaultLoggerConfig: LoggerConfig = {
  formatter: defaultFormatter,
  output: Deno.stdout,
};

function defaultFormatter(ctx: Context): string {
  const d = new Date().toISOString();
  const dateFmt = `[${d.slice(0, 10)} ${d.slice(11, 19)}]`;
  const log =
    `${dateFmt} "${ctx.request.method} ${ctx.request.url}" ${ctx.response.status}\n`;
  return log;
}

/** Logs responses outside of the range 200-299. */
export function logger(config: LoggerConfig = defaultLoggerConfig) {
  return async (ctx: Context): Promise<void> => {
    if (!ctx.response.ok) {
      await Deno.write(
        config.output.rid,
        new TextEncoder().encode(config.formatter(ctx)),
      );
    }
  };
}
