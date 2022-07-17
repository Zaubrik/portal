import { AuthState, fallBack, logger, verifyJwt } from "./mod.ts";
import {
  compose,
  Context,
  createHandler,
  createRoute,
  listen,
} from "./deps.ts";

type State = {};
const state: State = { payload: {} };

/** The `Ctx` is accessible inside the `Handlers` as only argument. */
export class Ctx extends Context<State> {
  pathname = this.url.pathname;
}

function greet(ctx: Ctx) {
  ctx.response = new Response(`Hello World!`);
  return ctx;
}

let f = compose(greet, greet);

const finallyHandler = await logger(new URL("./log/log.txt", import.meta.url));
const handler = createHandler(Ctx, state)(greet, verifyJwt("./"))(fallBack)(
  finallyHandler,
);

await listen({ port: 8080 })(handler);
