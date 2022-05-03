import { Context } from "../portal.ts";

type AllowedItems = {
  allowedOrigin?: string;
  allowedHeaders?: string;
};

/**
 * Takes a config of `AllowedItems` and returns a middleware which enables CORS
 * by adding headers to the `Response`.
 */
export function enableCors(
  { allowedOrigin = "*", allowedHeaders = "*" }: AllowedItems = {},
): (ctx: Context) => Response {
  return (ctx: Context) => {
    ctx.response.headers.append("access-control-allow-origin", allowedOrigin);
    ctx.response.headers.append("access-control-allow-headers", allowedHeaders);
    return ctx.response;
  };
}
