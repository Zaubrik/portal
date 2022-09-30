import {
  Context,
  createHttpError,
  join,
  mergeUrl,
  Status,
  UrlProperties,
} from "../deps.ts";
import { getSubdomainPath } from "./subdomain.ts";

type Options = {
  hasSubdomainDirectory?: boolean;
};

/**
 * A curried middleware which fetches and returns a `Response` from another or
 * partial `URL` object.
 */
export function fetchResponse(
  urlOrProps?: UrlProperties,
  { hasSubdomainDirectory }: Options = {},
) {
  return async <C extends Context>(ctx: C): Promise<C> => {
    try {
      const url = urlOrProps ? mergeUrl(ctx.url)(urlOrProps) : ctx.url;
      if (hasSubdomainDirectory) {
        url.pathname = join(`/${getSubdomainPath(ctx)}`, url.pathname);
      }
      const newRequest = new Request(url.href, ctx.request);
      ctx.response = await fetch(newRequest);
      return ctx;
    } catch (error) {
      throw createHttpError(Status.InternalServerError, error.message);
    }
  };
}
