import { Context, mergeUrl, UrlProperties } from "../deps.ts";

/** Fetches and returns a `Response` from another `URL` object or it properties.*/
export function fetchResponse(urlOrProps: UrlProperties) {
  return async <C extends Context>(ctx: C): Promise<C> => {
    const url = mergeUrl(ctx.url)(urlOrProps);
    const newRequest = new Request(url.href, ctx.request);
    ctx.response = await fetch(newRequest);
    return ctx;
  };
}
