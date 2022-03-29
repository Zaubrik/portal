# portal

Fast and simple routing with the `URLPattern` interface for Deno

## Example

```ts
import {
  errorFallback,
  Portal,
  serveStatic,
} from "https://deno.land/x/portal/mod.ts";

const app = new Portal({ start: 0 });

app.use((ctx) => {
  const start = Date.now();
  ctx.state.start = start;
});

app.get(
  "/:hello",
  (ctx) =>
    new Response(`Hello ${ctx.urlPatternResult.pathname.groups["hello"]}`),
);

app.get("*", serveStatic(new URL("./static", import.meta.url).pathname));

app.use((ctx) => {
  const ms = Date.now() - ctx.state.start;
  ctx.response.headers.set("X-Response-Time", `${ms}ms`);
});

app.catch(errorFallback);

app.finally((ctx) => {
  const rt = ctx.response.headers.get("X-Response-Time");
  console.log(`${ctx.request.method} ${ctx.url.pathname} - ${String(rt)}`);
});

console.log("Listening on http://0.0.0.0:8080");
await app.listen({ port: 8080 });
```

## Benchmarks

`wrk -c 100 -d 40 http://localhost:1234`

| Framework  | Version | Requests/sec | Transfer/sec |
| :--------- | :------ | -----------: | -----------: |
| **Portal** | 0.0.2   |     22773.35 |       3.11MB |
| Oak        | v10.5.1 |     19777.88 |       2.72MB |
| Abc        | v1.3.3  |     15954.89 |       1.28MB |

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
getAndPost("/getorpost/*", (ctx) => new Response("Hello"));
```

##### get, post, delete, connect...

Takes a `pathname` and one or multiple `Handlers`. It applies the `Handlers` to
the named HTTP method and the specified route.

```ts
app.get("*", (ctx) => new Response("Hello"));
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

The passed `Handlers` will be executed when an exception has been thrown.

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
