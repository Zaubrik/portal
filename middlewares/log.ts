import { Context } from "../portal.ts";

type Formatter = (ctx: Context) => string;

export interface LoggerConfig {
  formatter: Formatter;
  output: { rid: number };
}

export const DefaultFormatter: Formatter = (ctx: Context) => {
  const d = new Date().toISOString();
  const dateFmt = `[${d.slice(0, 10)} ${d.slice(11, 19)}]`;
  const log =
    `${dateFmt} "${ctx.request.method} ${ctx.request.url}" ${ctx.response.status}\n`;
  return log;
};

export const DefaultLoggerConfig: LoggerConfig = {
  formatter: DefaultFormatter,
  output: Deno.stdout,
};

/** Logs responses with a status unequal to 200. */
export function logger(
  config: LoggerConfig = DefaultLoggerConfig,
) {
  return async (ctx: Context) => {
    if (ctx.response.status !== 200) {
      await Deno.write(
        config.output.rid,
        new TextEncoder().encode(config.formatter(ctx)),
      );
    }
  };
}
