import { Portal, serveStatic } from "../mod.ts";

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

app.catch((ctx) => new Response("Something went wrong", { status: 500 }));

app.finally((ctx) => {
  const rt = ctx.response.headers.get("X-Response-Time");
  console.log(
    `${ctx.request.method} ${ctx.url.pathname} - ${String(rt)}`,
  );
});

console.log("Listening on http://0.0.0.0:8080");
await app.listen({ port: 8080 });
