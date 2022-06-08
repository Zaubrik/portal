import { Portal } from "../portal.ts";
import { wwwRedirect } from "./www.ts";
import { assertEquals, getResponseTextFromApp } from "../test_deps.ts";

Deno.test("overview", async function () {
  const app = new Portal();
  const getResponseText = getResponseTextFromApp(app);
  app.get(
    { hostname: "www.*", pathname: "/books" },
    wwwRedirect,
    (_ctx) => new Response("Never"),
  );
  app.finally((ctx) => new Response(ctx.response.headers.get("Location")));
  assertEquals(
    await getResponseText(new Request("https://www.example.com/books")),
    "https://example.com/books",
  );
});
