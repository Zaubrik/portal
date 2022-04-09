import { Context } from "../portal.ts";

/**
 * Returns an appropriate `Response` according to the caught and passed `Error`.
 */
export function errorFallback(ctx: Context) {
  if (ctx.error) {
    if (ctx.error instanceof URIError) {
      return new Response("Bad Request", { status: 400 });
    } else if (ctx.error instanceof Deno.errors.NotFound) {
      return new Response("Not Found", { status: 404 });
    } else {
      return new Response("Internal Server Error", { status: 500 });
    }
  } else {
    throw Error("Never!");
  }
}
