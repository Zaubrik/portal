import { Context } from "../portal.ts";

export async function errorFallback(ctx: Context): Promise<Response> {
  if (ctx.error) {
    if (ctx.error instanceof Response) {
      return ctx.error;
    } else if (ctx.error instanceof URIError) {
      return new Response("Bad Request", { status: 400 });
    } else if (ctx.error instanceof Deno.errors.NotFound) {
      return new Response("Not Found", { status: 404 });
    } else {
      return new Response("Internal server error", { status: 500 });
    }
  } else {
    throw Error("Never!");
  }
}
