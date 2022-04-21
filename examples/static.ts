import { Portal, serveStatic } from "../mod.ts";

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
