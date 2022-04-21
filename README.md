# portal

Portal is a fast and simple routing framework powered by the
[URLPattern](https://developer.mozilla.org/en-US/docs/Web/API/URL_Pattern_API)
interface for Deno. The `URLPattern` interface matches URLs or parts of URLs
against a pattern. The pattern can contain capturing groups that extract parts
of the matched URL. The best way to learn and test the URL Pattern API is using
our free [URL Pattern User Interface](https://dev.zaubrik.com/urlpattern/).

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

## API

### Types

#### Context

The `Context` is accessible inside the `Handlers` as only argument.

#### Handlers

Receives a `Context` object and returns a `Response` object or `undefined`.

### Class

#### Portal

Faciliates routing powered by the `URLPattern` interface.

##### add

Creates routing functions.

```ts
const getAndPost = app.add("GET", "POST");
getAndPost({ pathname: "/path/*" }, (ctx) => new Response("Hello"));
```

##### get, post, delete, connect...

Takes a `URLPatternInput` and one or multiple `Handlers`. It applies the
`Handlers` to the named HTTP method and the specified route.

```ts
app.get({ pathname: "*" }, (ctx) => new Response("Hello"));
```

##### use

Adds one or multiple `Handlers` (middlewares) to all methods and routes.

```ts
app.use((ctx) => {
  const start = Date.now();
  ctx.state.start = start;
});
```

##### catch

The passed `Handlers` will be executed when an exception has been thrown which
is **not** a `Response` object. As a consequence a thrown `Response` object can
shortcut the execution order directly to the `finally` handlers.

```ts
app.catch((ctx) => new Response("Something went wrong", { status: 500 }));
```

##### finally

The passed `Handlers` will be executed after all other `Handlers`.

```ts
app.finally((ctx) => {
  const rt = ctx.response.headers.get("X-Response-Time");
  console.log(`${ctx.request.method} ${ctx.url.pathname} - ${String(rt)}`);
});
```

##### listen

Constructs a server, creates a listener on the given address, accepts incoming
connections, upgrades them to TLS, and handles requests.

```ts
await app.listen({ port: 8080 });
```

## Todo

- Add some tests for the middlewares.
- Create a `UrlPattern` Tester UI.
- Add `WebSocket` support when
  [WebSocketStream](https://deno.land/manual/runtime/http_server_apis#websocket-support)
  arrives.
