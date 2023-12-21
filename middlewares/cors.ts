import { type Context, isString } from "./deps.ts";

type AllowedItems = {
  allowedOrigins?: string | string[];
  allowedHeaders?: string;
  allowedMethods?: string;
  exposedHeaders?: string;
};
type Options = { enableSubdomains?: boolean; allowPreflight?: true };

/**
 * Takes an object of `AllowedItems` and `Options` and returns a middleware
 * which enables CORS by adding appropriate headers to the `Response`. If
 * `allowedOrigins` is left empty then any origin is allowed.  The option
 * `enableSubdomains` extends cors to all subdomains. You can take care of
 * preflight requests with the option `allowPreflight`.
 */
export function enableCors(
  {
    allowedOrigins = "*",
    allowedHeaders,
    allowedMethods,
    exposedHeaders,
  }: AllowedItems = {},
  { enableSubdomains = false, allowPreflight = true }: Options = {},
) {
  return <C extends Context>(ctx: C): C => {
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
      ctx.response.headers.set(
        "access-control-allow-headers",
        allowedHeaders,
      );
    }
    if (isString(allowedMethods)) {
      ctx.response.headers.set(
        "access-control-allow-methods",
        allowedMethods,
      );
    }
    if (isString(exposedHeaders)) {
      ctx.response.headers.set(
        "access-control-expose-headers",
        exposedHeaders,
      );
    }
    if (allowPreflight === true && ctx.request.method === "OPTIONS") {
      ctx.response = new Response(null, {
        status: 204,
        headers: ctx.response.headers,
      });
    }
    return ctx;
  };
}

export const enableDefaultCors = enableCors({
  allowedOrigins: "*",
  allowedMethods: "*",
  allowedHeaders: "Authorization, Content-Type",
});
