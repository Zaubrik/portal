import { Context } from "../portal.ts";

/** Remove "www." and redirect. */
export function wwwRedirect(ctx: Context) {
  throw new Response(undefined, {
    headers: new Headers({
      "Location": ctx.url.href.replace("www.", ""),
    }),
    status: 301,
  });
}
