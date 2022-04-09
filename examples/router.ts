import { Portal } from "../mod.ts";

const app = new Portal();

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

await app.listen({ port: 8080 });
