import { type Context, isHttpError, Status, STATUS_TEXT } from "./deps.ts";

/** Returns an object with the properties `body` and `status`. */
export function makeResponseData(
  error: Error,
): { body: string; status: number; headers?: Headers } {
  if (isHttpError(error)) {
    const body = error.expose ? error.message : STATUS_TEXT[error.status];
    const { status, headers } = error;
    return { body, status, headers };
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
    const { body, status, headers } = makeResponseData(ctx.error);
    ctx.response = new Response(body, { status, headers });
    return ctx;
  } else {
    throw Error(
      "This error should never happen because the error property of ctx inside 'fallBack' must not be falsy.",
    );
  }
}
