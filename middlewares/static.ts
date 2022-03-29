import { Context } from "../portal.ts";
import { join, serveFile } from "./deps.ts";

/**
 * A minimal static file server middleware.
 */

type ServeFileOptions = { home?: string; enableCors?: boolean };

function setCors(res: Response): void {
  res.headers.append("access-control-allow-origin", "*");
  res.headers.append(
    "access-control-allow-headers",
    "Origin, X-Requested-With, Content-Type, Accept, Range",
  );
}

export function serveStatic(
  // absolute path
  root: string,
  { home = "index.html", enableCors = false }: ServeFileOptions = {},
) {
  return async (ctx: Context) => {
    if (ctx.response.ok) return ctx.response;
    const filepath = join(
      root,
      ctx.url.pathname[ctx.url.pathname.length - 1] === "/"
        ? ctx.url.pathname + home
        : ctx.url.pathname,
    );
    const response = await serveFile(ctx.request, filepath);
    if (enableCors) setCors(response);
    return response;
  };
}
