import { Context, isHttpError, Status, STATUS_TEXT } from "../deps.ts";

/** Returns an object with the properties `body` and `status`. */
export function makeResponseData(error: Error) {
  if (isHttpError(error)) {
    const body = error.expose ? error.message : STATUS_TEXT[error.status];
    const status = error.status;
    return { body, status };
  } else if (error instanceof URIError) {
    return { body: STATUS_TEXT[Status.BadRequest], status: Status.BadRequest };
  } else if (error instanceof Deno.errors.NotFound) {
    return { body: STATUS_TEXT[Status.NotFound], status: Status.NotFound };
  } else {
    return {
      body: STATUS_TEXT[Status.InternalServerError],
      status: Status.InternalServerError,
    };
  }
}

/** The default error fallback that is called inside the `catch` statement first. */
export function fallBack<C extends Context>(ctx: C): C {
  if (ctx.error) {
    const { body, status } = makeResponseData(ctx.error);
    ctx.response = new Response(body, { status });
    return ctx;
  } else {
    throw Error("Never!");
  }
  return ctx;
}
