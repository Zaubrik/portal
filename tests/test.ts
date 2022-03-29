import { Portal } from "../portal.ts";
import { assertEquals, delay } from "./deps.ts";

const connInfo = {
  localAddr: { transport: "tcp" as const, hostname: "127.0.0.1", port: 8080 },
  remoteAddr: { transport: "tcp" as const, hostname: "127.0.0.1", port: 48951 },
};

function getResponseTextFromApp(app: Portal) {
  return async (request: Request) => {
    const response = await app.requestHandler(request, connInfo);
    const responseText = await response.text();
    return responseText;
  };
}

Deno.test("[portal] overview", async function () {
  const app = new Portal();
  const getResponseText = getResponseTextFromApp(app);
  app.get(
    "/books/:id",
    (ctx) => new Response(ctx.url.pathname),
  );
  assertEquals(
    await getResponseText(new Request("https://example.com/books/123")),
    "/books/123",
  );
  app.get(
    "*",
    (ctx) => new Response(ctx.url.host),
    (ctx) => new Response(ctx.url.pathname),
  );
  assertEquals(
    await getResponseText(new Request("https://example.com/books/123")),
    "/books/123",
  );
});

Deno.test("[portal] middleware", async function () {
  const app = new Portal();
  const getResponseText = getResponseTextFromApp(app);
  app.get(
    "/books/:id",
    (ctx) => new Response(ctx.url.host),
  );
  app.use((_ctx) => new Response("All routes and methods."));
  assertEquals(
    await getResponseText(new Request("https://example.com/books/123")),
    "All routes and methods.",
  );
});

Deno.test("[portal] catch and finally", async function () {
  const app = new Portal();
  const getResponseText = getResponseTextFromApp(app);
  app.get(
    "/books/:id",
    (_ctx) => {
      throw new Error("upps");
    },
    (ctx) => new Response(ctx.urlPatternResult.pathname.groups.id),
  );
  app.catch((_ctx) => new Response("caught"));
  assertEquals(
    await getResponseText(new Request("https://example.com/books/123")),
    "caught",
  );
  app.get(
    "/books/:id",
    (_ctx) => {
      throw new Error("upps");
    },
    (ctx) => new Response(ctx.urlPatternResult.pathname.groups.id),
  );
  app.catch((_ctx) => new Response("caught"));
  app.finally((_ctx) => new Response("finally"));
  assertEquals(
    await getResponseText(new Request("https://example.com/books/123")),
    "finally",
  );
});

Deno.test("[portal] custom state", async function () {
  const app = new Portal({ counter: 10 });
  app.get(
    "*",
    (ctx) => {
      ++ctx.state.counter;
    },
    (ctx) => new Response((++ctx.state.counter).toString()),
  );
  const response = await app.requestHandler(
    new Request("https://example.com/books/123"),
    connInfo,
  );
  const responseText = await response.text();
  assertEquals(responseText, "12");
});

Deno.test("[portal] urlPatternResult", async function () {
  const app = new Portal();
  const getResponseText = getResponseTextFromApp(app);
  app.get(
    "/books/:id",
    (ctx) => new Response(ctx.urlPatternResult.pathname.groups.id),
  );
  assertEquals(
    await getResponseText(new Request("https://example.com/books/123")),
    "123",
  );
  app.get(
    "/books/:genre/:title?",
    (ctx) => new Response(ctx.urlPatternResult.pathname.groups.genre),
  );
  assertEquals(
    await getResponseText(new Request("https://example.com/books/action")),
    "action",
  );
  app.get(
    "/books/:genre/:title?",
    (ctx) => new Response(ctx.urlPatternResult.pathname.groups.title),
  );
  assertEquals(
    await getResponseText(new Request("https://example.com/books/action")),
    "",
  );
  app.get(
    "/books/:genre/:title?",
    (ctx) =>
      new Response(
        `${ctx.urlPatternResult.pathname.groups.genre}: ${ctx.urlPatternResult.pathname.groups.title}`,
      ),
  );
  assertEquals(
    await getResponseText(
      new Request("https://example.com/books/action/circe"),
    ),
    "action: circe",
  );
});

Deno.test("[portal] urlPatternResult with wildcards", async function () {
  const app = new Portal();
  const getResponseText = getResponseTextFromApp(app);
  app.get(
    "*",
    (ctx) => new Response(ctx.urlPatternResult.pathname.groups["0"]),
  );
  assertEquals(
    await getResponseText(new Request("https://example.com/")),
    "/",
  );
  assertEquals(
    await getResponseText(new Request("https://example.com/books/action")),
    "/books/action",
  );
  app.get(
    "/*/:genre/*",
    (ctx) =>
      new Response(
        `${ctx.urlPatternResult.pathname.groups["0"]}: ${
          ctx.urlPatternResult.pathname.groups["genre"]
        }: ${ctx.urlPatternResult.pathname.groups["1"]}`,
      ),
  );
  assertEquals(
    await getResponseText(
      new Request("https://example.com/books/action/circe"),
    ),
    "books: action: circe",
  );
});

Deno.test("[portal] execution order", async function () {
  const app = new Portal();
  const getResponseText = getResponseTextFromApp(app);
  app.get(
    "/books/:id",
    (_ctx) => new Response("never"),
    (ctx) => new Response(ctx.urlPatternResult.pathname.groups.id),
  );
  assertEquals(
    await getResponseText(new Request("https://example.com/books/123")),
    "123",
  );
  app.get(
    "/books/:id",
    (_ctx) => new Response("never"),
    async (_ctx) => {
      await delay(10);
      return new Response("never");
    },
    (ctx) => new Response(ctx.urlPatternResult.pathname.groups.id),
  );
  assertEquals(
    await getResponseText(new Request("https://example.com/books/123")),
    "123",
  );
  app.get(
    "/books/:id",
    (_ctx) => new Response("never"),
    async (_ctx) => {
      await delay(10);
      return new Response("never");
    },
  );
  app.use((_ctx) => new Response("middleware"));
  assertEquals(
    await getResponseText(new Request("https://example.com/books/123")),
    "middleware",
  );
});
