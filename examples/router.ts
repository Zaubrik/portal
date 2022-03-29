import { Portal } from "../mod.ts";

const app = new Portal();

app.get("/", (ctx) => new Response("Hello World\n"));

app.get(
  "/:hello",
  (ctx) => {
    return new Response(
      `Oh, hello ${ctx.urlPatternResult.pathname.groups["hello"]}!`,
    );
  },
);

app.get(
  "/static/*",
  (ctx) => new Response(`wild: ${ctx.urlPatternResult.pathname.groups["0"]}`),
);

app.get(
  "/books/:genre/:title?",
  (ctx) =>
    new Response(
      `genre: ${ctx.urlPatternResult.pathname.groups["genre"]}, title: ${
        ctx.urlPatternResult.pathname.groups["title"]
      }`,
    ),
);

// A simple logger middleware
app.use((ctx) => console.log(ctx.request.method, ctx.request.url));

console.log("Listening on http://0.0.0.0:8080");
await app.listen({ port: 8080 });
