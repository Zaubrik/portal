import { Context } from "../portal.ts";

/** Removes "www." and redirects with status `301`. */
export function wwwRedirect(ctx: Context) {
  throw new Response(undefined, {
    headers: new Headers({
      "Location": ctx.url.href.replace("www.", ""),
    }),
    status: 301,
  });
}
