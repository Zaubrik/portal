import { Context, createHttpError, createOgImage, Status } from "../deps.ts";

/**
 * The middleware generates cached dynamic Open Graph images that you can embed
 * in your html `meta` tags.
 * ```ts
 * get({ pathname: "/{:text}.png" }, serveOgImage);
 * ```
 */
export async function serveOgImage<C extends Context>(ctx: C): Promise<C> {
  try {
    const canvas = await createOgImage(ctx.request);
    ctx.response = new Response(canvas.toBuffer(), {
      headers: {
        "content-type": "image/png",
        "Cache-Control":
          `public, immutable, no-transform, s-maxage=31536000, max-age=31536000`,
      },
    });
    return ctx;
  } catch (err) {
    throw err instanceof URIError
      ? createHttpError(Status.BadRequest, err.message)
      : createHttpError(Status.InternalServerError, err.message);
  }
}
