export * from "./jwt.ts";
export * from "./cors.ts";
export * from "./fallback.ts";
export * from "./fetch.ts";
export * from "./webhook.ts";
export * from "./log.ts";
export * from "./smtp.ts";
export * from "./static.ts";
export * from "./subdomain.ts";

import { Context } from "./deps.ts";
import { logger } from "./log.ts";
import { serveStatic } from "./static.ts";
import { enableCors } from "./cors.ts";
import { type PayloadState } from "./jwt.ts";
import { type WebhooksState } from "./webhook.ts";

type State = PayloadState & WebhooksState;
export class Ctx extends Context<State> {}

export const defaultLogger = logger("./.log/access.log");
export const defaultServeStatic = serveStatic("./static");
export const defaultCors = enableCors({
  allowedOrigins: "*",
  allowedMethods: "*",
  allowedHeaders: "Authorization, Content-Type",
});
export function returnOk<C extends Context>(ctx: C): C {
  ctx.response = new Response();
  return ctx;
}
