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
  disableCopying?: boolean;
};

/**
 * A curried middleware which fetches and returns a `Response` from another or
 * partial `URL` object. The option `disableCopying` returns the original and
 * unmutable `Response`. The option `hasSubdomainDirectory` moves subdomains to
 * the pathname.
 */
export function fetchResponse(
  urlOrProps?: UrlProperties,
  { hasSubdomainDirectory, disableCopying }: Options = {},
) {
  return async <C extends Context>(ctx: C): Promise<C> => {
    try {
      const url = urlOrProps ? mergeUrl(ctx.url)(urlOrProps) : ctx.url;
      if (hasSubdomainDirectory) {
        url.pathname = join(`/${getSubdomainPath(ctx)}`, url.pathname);
      }
      const newRequest = new Request(url.href, ctx.request);
      const response = await fetch(newRequest);
      if (!disableCopying) {
        ctx.response = copyResponse(ctx.response);
      } else {
        ctx.response = response;
      }
      return ctx;
    } catch (error) {
      throw createHttpError(Status.InternalServerError, error.message);
    }
  };
}

/**
 * Difference between cloning and copying of a `Response`:
 * https://community.cloudflare.com/t/whats-the-point-of-response-clone/216456
 */
export function copyResponse(response: Response) {
  return new Response(response.body, response);
}
