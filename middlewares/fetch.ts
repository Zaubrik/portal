import {
  type Context,
  copyResponse,
  createHttpError,
  join,
  mergeUrl,
  Status,
  type UrlProperties,
} from "./deps.ts";
import { getSubdomainPath } from "./subdomain.ts";

type Options = {
  hasSubdomainDirectory?: boolean;
  isCopy?: boolean;
};

/**
 * A curried middleware which fetches and returns a `Response` from another or
 * partial `URL` object. The option `isCopy` returns a copy and not the original,
 * unmutable `Response`. The option `hasSubdomainDirectory` moves subdomains to
 * the pathname.
 */
export function fetchResponse(
  urlOrProps?: UrlProperties,
  { hasSubdomainDirectory, isCopy = true }: Options = {},
) {
  return async <C extends Context>(ctx: C): Promise<C> => {
    try {
      const url = urlOrProps ? mergeUrl(ctx.url)(urlOrProps) : ctx.url;
      if (hasSubdomainDirectory) {
        url.pathname = join(`/${getSubdomainPath(ctx)}`, url.pathname);
      }
      const newRequest = new Request(url.href, ctx.request);
      const response = await fetch(newRequest);
      if (isCopy) {
        ctx.response = copyResponse(response);
      } else {
        ctx.response = response;
      }
      return ctx;
    } catch (error) {
      throw createHttpError(Status.InternalServerError, error.message);
    }
  };
}
