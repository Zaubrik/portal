import {
  Context,
  createGetRoute,
  createHandler,
} from "https://dev.zaubrik.com/composium@v0.1.1/mod.ts";
import { enableDefaultCors, fallBack, logger } from "../middlewares/mod.ts";

function welcome<C extends Context>(ctx: C) {
  const name = ctx.result.pathname.groups.name || "nobody";
  ctx.response = new Response(`Welcome, ${name}!`);
  return ctx;
}

const welcomeRoute = createGetRoute({ pathname: "/{:name}?" })(welcome);

const handler = createHandler(Context)(welcomeRoute)(fallBack)(
  logger(),
  enableDefaultCors,
);

Deno.serve({ port: 8080 }, handler);
