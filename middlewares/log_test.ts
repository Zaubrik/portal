import { Portal } from "../portal.ts";
import { logger } from "./log.ts";
import { assertEquals, getResponseTextFromApp } from "../test_deps.ts";

Deno.test("[log] confirm return type void", async function () {
  const app = new Portal();
  const getResponseText = getResponseTextFromApp(app);
  app.get(
    { pathname: "/books" },
    (_ctx) => new Response("Hello World"),
    logger(),
  );
  assertEquals(
    await getResponseText(new Request("https://www.example.com/books")),
    "Hello World",
  );
});
