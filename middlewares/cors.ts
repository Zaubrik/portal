import { Context } from "../portal.ts";
import { isString } from "./deps.ts";

type AllowedItems = {
  allowedOrigins?: string | string[];
  allowedHeaders?: string;
  allowedMethods?: string;
};
type Options = { enableSubdomains?: boolean };

/**
 * Takes an object of `AllowedItems` and `Options` and returns a middleware
 * which enables CORS by adding appropriate headers to the `Response`. If
 * `allowedOrigins` is left empty then any host is allowed.
 */
export function enableCors(
  { allowedOrigins = "*", allowedHeaders, allowedMethods }: AllowedItems = {},
  { enableSubdomains = false }: Options = {},
) {
  return (ctx: Context): Response => {
    const origin = ctx.request.headers.get("origin");
    if (origin && allowedOrigins !== undefined) {
      const allowedOriginsArray = [allowedOrigins].flat();
      if (allowedOriginsArray.includes("*")) {
        ctx.response.headers.set("access-control-allow-origin", "*");
      } else if (enableSubdomains) {
        if (
          allowedOriginsArray.some((allowedOrigin) => {
            const url = new URL(allowedOrigin);
            const urlPattern = new URLPattern({
              protocol: url.protocol,
              hostname: `{:subdomain.}*${url.hostname}`,
              port: url.port || "*",
            });
            return urlPattern.test(origin);
          })
        ) {
          ctx.response.headers.set("access-control-allow-origin", origin);
        }
      } else if (allowedOriginsArray.includes(origin)) {
        ctx.response.headers.set("access-control-allow-origin", origin);
      }
    }
    if (isString(allowedHeaders)) {
      ctx.response.headers.append(
        "access-control-allow-headers",
        allowedHeaders,
      );
    }
    if (isString(allowedMethods)) {
      ctx.response.headers.append(
        "access-control-allow-meaders",
        allowedMethods,
      );
    }
    return ctx.response;
  };
}
