import { Context } from "../portal.ts";
import { mergeUrl, UrlProperties } from "./deps.ts";

/** Fetches and returns a `Response` from another `URL` object or it properties.*/
export function fetchResponse(urlOrProps: Partial<URL>) {
  return async (ctx: Context): Promise<Response> => {
    const url = mergeUrl(new URL(ctx.request.url))(urlOrProps);
    const newRequest = new Request(url.href, ctx.request);
    const result = await fetch(newRequest);
    return result;
  };
}
