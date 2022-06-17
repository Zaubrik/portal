import { Portal } from "../mod.ts";

const app = new Portal();

app.use((ctx) => {
  const start = Date.now();
  ctx.state.start = start;
});

app.get({ pathname: "/(|world)" }, (_ctx) => new Response("Hello World"));

app.get(
  { pathname: "/:hello" },
  (ctx) => {
    return new Response(
      `Oh, hello ${ctx.urlPatternResult.pathname.groups["hello"]}!`,
    );
  },
);

app.get(
  { pathname: "/wild/*" },
  (ctx) => new Response(`wild: ${ctx.urlPatternResult.pathname.groups["0"]}`),
);

app.get(
  { pathname: "/books/:genre/:title?" },
  (ctx) =>
    new Response(
      `genre: ${ctx.urlPatternResult.pathname.groups["genre"]}, title: ${
        ctx.urlPatternResult.pathname.groups["title"]
      }`,
    ),
);

app.use((ctx) => console.log(ctx.request.method, ctx.request.url));

app.use((ctx) => {
  const ms = Date.now() - ctx.state.start;
  ctx.response.headers.set("X-Response-Time", `${ms}ms`);
});

app.finally((ctx) => {
  const rt = ctx.response.headers.get("X-Response-Time");
  console.log(`${ctx.request.method} ${ctx.url.pathname} - ${String(rt)}`);
});

await app.listen({ port: 8080 });
