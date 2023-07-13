import {
  type Context,
  createGetRoute,
  createHandler,
} from "https://dev.zaubrik.com/composium@v0.1.1/mod.ts";
import {
  Ctx,
  defaultCors,
  defaultLogger,
  fallBack,
} from "../middlewares/mod.ts";

function welcome<C extends Context>(ctx: C) {
  const name = ctx.result.pathname.groups.name || "nobody";
  ctx.response = new Response(`Welcome, ${name}!`);
  return ctx;
}

const tryMiddleware = createGetRoute({ pathname: "/{:name}?" })(welcome);

const handler = createHandler(Ctx)(tryMiddleware)(fallBack)(
  defaultLogger,
  defaultCors,
);

Deno.serve({ port: 8080 }, handler);
