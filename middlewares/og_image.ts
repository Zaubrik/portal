import { createOgImage } from "./deps.ts";
import { Context } from "../portal.ts";

/**
 * This middleware generates dynamic Open Graph images that you can embed in your
 * html meta tags.
 * ```ts
 * app.get({ pathname: "/{:text}.png" }, serveOgImage);
 * ```
 */
export async function serveOgImage(ctx: Context): Promise<Response> {
  try {
    const canvas = await createOgImage(ctx.request);
    return new Response(canvas.toBuffer(), {
      headers: { "content-type": "image/png" },
    });
  } catch {
    throw new Response("Bad Request", { status: 400 });
  }
}
