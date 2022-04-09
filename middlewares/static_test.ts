import { Portal } from "../portal.ts";
import { serveStatic } from "./static.ts";
import { assertEquals, getResponseTextFromApp } from "../test_deps.ts";

Deno.test("[static] overview", async function () {
  const app = new Portal();
  const getResponseText = getResponseTextFromApp(app);
  app.get({ pathname: "*" }, serveStatic(""));
  assertEquals(
    await getResponseText(
      new Request(new URL(import.meta.url).href),
    ),
    await Deno.readTextFile(new URL(import.meta.url).pathname),
  );
});
