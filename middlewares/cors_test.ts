import { enableCors } from "./cors.ts";
import { Context, createHandler, createRoute } from "../deps.ts";
import { assertEquals, connInfo, identity } from "../test_deps.ts";

const getRoute = createRoute("GET");

Deno.test("Set allowed origins", async function () {
  const booksRoute = getRoute({ pathname: "/books" })(enableCors());
  const toysRoute = getRoute({ pathname: "/toys" })(
    enableCors({ allowedOrigins: "https://pet.com" }),
  );
  const carsRoute = getRoute({ pathname: "/cars" })(
    enableCors({ allowedOrigins: ["https://another.com"] }, {
      enableSubdomains: true,
    }),
  );
  const finnalyRoute = getRoute({ pathname: "*" })((ctx) => {
    ctx.response = new Response(
      ctx.response.headers.get("access-control-allow-origin"),
    );
    return ctx;
  });
  const handler = createHandler(Context)(
    booksRoute,
    toysRoute,
    carsRoute,
  )(identity)(finnalyRoute);

  assertEquals(
    await (await handler(
      new Request("https://example.com/books", {
        headers: { origin: "https://pet.com/books" },
      }),
      connInfo,
    )).text(),
    "*",
  );
  assertEquals(
    await (await handler(
      new Request("https://example.com/toys", {
        headers: { origin: "https://pet.com" },
      }),
      connInfo,
    )).text(),
    "https://pet.com",
  );
  assertEquals(
    await (await handler(
      new Request("https://example.com/cars", {
        headers: { origin: "https://blog.news.another.com" },
      }),
      connInfo,
    )).text(),
    "https://blog.news.another.com",
  );
});

const ctx = new Context(new Request("https://example.com/books/123"), connInfo);
const getBooksRoute = getRoute({ pathname: "/books/*" });

Deno.test("Set allowed headers", async function () {
  assertEquals(
    (await getBooksRoute(
      enableCors({ allowedHeaders: "Content-Type, x-requested-with" }),
    )(ctx)).response.headers.get("access-control-allow-headers"),
    "Content-Type, x-requested-with",
  );
});

Deno.test("Set allowed methods", async function () {
  assertEquals(
    (await getBooksRoute(
      enableCors({ allowedMethods: "POST, GET, OPTIONS" }),
    )(ctx)).response.headers.get("Access-Control-Allow-Methods"),
    "POST, GET, OPTIONS",
  );
});
