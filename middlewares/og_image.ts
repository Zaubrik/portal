import { createOgImage } from "./deps.ts";
import { Context } from "../portal.ts";

/**
 * This middleware generates dynamic Open Graph images that you can embed
 * in your html meta tags. Either it returns a `Response` with `Cache-Control`
 * headers or it throws an `Error`.
 * ```ts
 * app.get({ pathname: "/{:text}.png" }, serveOgImage);
 * ```
 */
export async function serveOgImage(ctx: Context): Promise<Response> {
  const canvas = await createOgImage(ctx.request);
  return new Response(canvas.toBuffer(), {
    headers: {
      "content-type": "image/png",
      "Cache-Control":
        `public, immutable, no-transform, s-maxage=31536000, max-age=31536000`,
    },
  });
}
