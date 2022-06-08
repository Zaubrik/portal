import { Context } from "../portal.ts";

type AllowedItems = {
  allowedOrigins?: string | string[];
  allowedHeaders?: string;
  allowedMethods?: string;
};

/**
 * Takes an object of `AllowedItems` and returns a middleware which enables CORS
 * by adding appropriate headers to the `Response`. If `allowedOrigins` is left
 * empty then any host is allowed.
 */
export function enableCors(
  { allowedOrigins = "*", allowedHeaders, allowedMethods }: AllowedItems = {},
): (ctx: Context) => Response {
  return (ctx: Context) => {
    if (typeof allowedOrigins === "string") {
      ctx.response.headers.set("access-control-allow-origin", allowedOrigins);
    } else {
      const origin = ctx.request.headers.get("origin");
      if (origin && allowedOrigins.includes(origin)) {
        ctx.response.headers.set("access-control-allow-origin", origin);
      }
    }
    if (typeof allowedHeaders === "string") {
      ctx.response.headers.append(
        "access-control-allow-headers",
        allowedHeaders,
      );
    }
    if (typeof allowedMethods === "string") {
      ctx.response.headers.append(
        "access-control-allow-meaders",
        allowedMethods,
      );
    }
    return ctx.response;
  };
}
