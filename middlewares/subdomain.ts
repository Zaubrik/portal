import { Context } from "../portal.ts";

/**
 * Subdomain Middleware
 * Adapted from https://github.com/edwardhotchkiss/subdomain
 */

type Options = {
  // E.g. "localhost:8080"
  base: string;
  removeWWW?: boolean;
  ignoreWWW?: boolean;
  prefix?: string;
  sharedDirectory?: string;
};

export function subdomain(
  {
    base,
    removeWWW = true,
    ignoreWWW = true,
    prefix = "subdomain",
    sharedDirectory = "",
  }: Options,
) {
  return (ctx: Context) => {
    // Remove 'www' prefix from URL and redirect.
    if (removeWWW === true && /^www\./.test(ctx.url.host)) {
      throw new Response(undefined, {
        headers: new Headers({
          "Location": ctx.url.href.replace(/www\./, ""),
        }),
        status: 301,
      });
    }
    // Not a subdomain or ignoring www subdomain.
    if (
      ctx.url.host === base || (ignoreWWW && /^www\./.test(ctx.url.host)) ||
      (sharedDirectory && ctx.url.pathname.startsWith(`/${sharedDirectory}/`))
    ) {
      return undefined;
    }
    // Subdomain
    const matches = ctx.url.host.match(new RegExp("(.*)\." + base));
    if (matches && matches.length === 2) {
      ctx.url = new URL(
        // Replace the divider `.` of multiple subdomains with `/`.
        "/" + prefix + "/" + matches[1].replace(".", "/") + ctx.url.pathname,
        ctx.url.protocol + "//" + ctx.url.host.replace(matches[1] + ".", ""),
      );
    }
  };
}
