import { Context, join, mergeUrl, UrlProperties } from "../deps.ts";

type FetchResponseOptions = {
  hasSubdomainDirectory?: boolean;
};

/** Fetches and returns a `Response` from another or partial `URL` object.*/
export function fetchResponse(
  urlOrProps: UrlProperties,
  { hasSubdomainDirectory }: FetchResponseOptions,
) {
  return async <C extends Context>(ctx: C): Promise<C> => {
    const url = mergeUrl(ctx.url)(urlOrProps);
    const subdomainStr = getSubdomainPath(ctx, hasSubdomainDirectory);
    url.pathname = join(`/${subdomainStr}`, url.pathname);
    const newRequest = new Request(url.href, ctx.request);
    ctx.response = await fetch(newRequest);
    return ctx;
  };
}

function getSubdomainPath(
  ctx: Context,
  hasSubdomainDirectory?: boolean,
): string {
  try {
    if (!hasSubdomainDirectory) return "";
    const { subdomain } = ctx.params.hostname.groups as any;
    if (!subdomain) {
      throw new Error("No valid hostname params.");
    }
    const subdomainDirectoryResult = decodeUriComponentSafely(subdomain)
      .replaceAll(".", "/");
    return subdomainDirectoryResult;
  } catch (err) {
    throw createHttpError(Status.InternalServerError, err.message);
  }
}
