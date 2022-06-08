import { Portal } from "../portal.ts";
import { enableCors } from "./cors.ts";
import { assertEquals, getResponseTextFromApp } from "../test_deps.ts";

Deno.test("overview", async function () {
  const app = new Portal();
  const getResponseText = getResponseTextFromApp(app);
  app.get({ pathname: "/books" }, enableCors());
  app.finally((ctx) =>
    new Response(ctx.response.headers.get("access-control-allow-origin"))
  );
  assertEquals(
    await getResponseText(new Request("https://example.com/books")),
    "*",
  );
});
