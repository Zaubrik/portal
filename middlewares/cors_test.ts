import { Portal } from "../portal.ts";
import { enableCors } from "./cors.ts";
import { assertEquals, getResponseTextFromApp } from "../test_deps.ts";

Deno.test("overview", async function () {
  const app = new Portal();
  const getResponseText = getResponseTextFromApp(app);
  app.get({ pathname: "/books" }, enableCors());
  app.get(
    { pathname: "/toys" },
    enableCors({ allowedOrigins: ["https://new.com"] }),
  );
  app.get(
    { pathname: "/cars" },
    enableCors({ allowedOrigins: ["https://another.com"] }, {
      enableSubdomains: true,
    }),
  );
  app.finally((ctx) =>
    new Response(ctx.response.headers.get("access-control-allow-origin"))
  );
  assertEquals(
    await getResponseText(
      new Request("https://example.com/books", {
        headers: { origin: "https://new.com/books" },
      }),
    ),
    "*",
  );
  assertEquals(
    await getResponseText(
      new Request("https://example.com/toys", {
        headers: { origin: "https://new.com" },
      }),
    ),
    "https://new.com",
  );
  assertEquals(
    await getResponseText(
      new Request("https://example.com/cars", {
        headers: { origin: "https://aaa.bbb.another.com" },
      }),
    ),
    "https://aaa.bbb.another.com",
  );
});
