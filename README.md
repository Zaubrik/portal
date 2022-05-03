# portal

Portal is a fast and simple routing framework powered by the
[URLPattern](https://developer.mozilla.org/en-US/docs/Web/API/URL_Pattern_API)
interface for Deno. The `URLPattern` interface matches URLs or parts of URLs
against a pattern. The pattern can contain capturing groups that extract parts
of the matched URL. The best way to learn and test the URL Pattern API is using
our free [URL Pattern User Interface](https://dev.zaubrik.com/urlpattern/).

## API

```bash
deno doc https://deno.land/x/portal/mod.ts
```

## Example

```ts
import { Portal, serveStatic } from "https://deno.land/x/portal/mod.ts";

const app = new Portal({ start: 0 });

app.use((ctx) => {
  const start = Date.now();
  ctx.state.start = start;
});

app.get(
  { pathname: "/greeting/:hello" },
  (ctx) =>
    new Response(`Hello ${ctx.urlPatternResult.pathname.groups["hello"]}`),
);

app.get(
  { pathname: "/(|index.html|cat.jpeg)" },
  serveStatic(new URL("./static", import.meta.url)),
);

app.use((ctx) => {
  const ms = Date.now() - ctx.state.start;
  ctx.response.headers.set("X-Response-Time", `${ms}ms`);
});

app.finally((ctx) => {
  const rt = ctx.response.headers.get("X-Response-Time");
  console.log(`${ctx.request.method} ${ctx.url.pathname} - ${String(rt)}`);
});

await app.listen({ port: 8080 });
```

## Todo

- Add `WebSocket` support when
  [WebSocketStream](https://deno.land/manual/runtime/http_server_apis#websocket-support)
  arrives.
