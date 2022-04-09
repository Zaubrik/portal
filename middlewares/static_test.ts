import { Portal } from "../portal.ts";
import { serveStatic } from "./static.ts";
import { assertEquals, getResponseTextFromApp } from "../test_deps.ts";

Deno.test("[static] overview", async function () {
  const app = new Portal();
  const getResponseText = getResponseTextFromApp(app);
  app.get({ pathname: "*" }, serveStatic(new URL("./", import.meta.url)));
  assertEquals(
    await getResponseText(
      new Request(`https://example.com/${import.meta.url.split("/").pop()}`),
    ),
    await Deno.readTextFile(new URL(import.meta.url)),
  );
});
