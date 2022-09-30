import { Context } from "../deps.ts";

export type StartState = { start: number };

export function startTime<C extends Context<StartState>>(ctx: C): C {
  const start = Date.now();
  ctx.state.start = start;
  return ctx;
}

export function setXResponseTime<C extends Context<StartState>>(ctx: C): C {
  const ms = Date.now() - ctx.state.start;
  ctx.response.headers.set("X-Response-Time", `${ms}ms`);
  return ctx;
}
