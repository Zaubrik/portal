import { serveStatic } from "./static.ts";
import { Context } from "../deps.ts";
import { assertEquals, connInfo, createRoute } from "../test_deps.ts";

const allAndEverythingRoute = createRoute("ALL")({ pathname: "*" });
const ctx = new Context(
  new Request(`https://example.com/${import.meta.url.split("/").pop()}`),
  connInfo,
);

Deno.test("overview", async function () {
  const returnedCtx = await allAndEverythingRoute(
    serveStatic(new URL("./", import.meta.url)),
  )(ctx);
  assertEquals(
    await returnedCtx.response.text(),
    await Deno.readTextFile(new URL(import.meta.url)),
  );
});
