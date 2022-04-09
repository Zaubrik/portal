import { Portal } from "../portal.ts";
import { errorFallback } from "./catch.ts";
import { assertEquals, getResponseTextFromApp } from "../test_deps.ts";

Deno.test("[catch] internal server error", async function () {
  const app = new Portal();
  const getResponseText = getResponseTextFromApp(app);
  app.get(
    { pathname: "/books" },
    (_ctx) => {
      throw new Error("upps");
    },
  );
  app.catch(errorFallback);
  assertEquals(
    await getResponseText(new Request("https://www.example.com/books")),
    "Internal Server Error",
  );
});

Deno.test("[catch] ignore thrown response", async function () {
  const app = new Portal();
  const getResponseText = getResponseTextFromApp(app);
  app.get(
    { pathname: "/books" },
    (_ctx) => {
      throw new Response("Hello World");
    },
  );
  app.catch(errorFallback);
  assertEquals(
    await getResponseText(new Request("https://www.example.com/books")),
    "Hello World",
  );
});
