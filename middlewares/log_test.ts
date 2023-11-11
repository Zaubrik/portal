import { logger } from "./log.ts";
import { Context } from "./deps.ts";
import { assertEquals, connInfo, createRoute } from "../test_deps.ts";

const allAndEverythingRoute = createRoute("ALL")({ pathname: "*" });
const ctx = new Context(new Request("https://example.com/books/123"), connInfo);

Deno.test("Overview", async function () {
  assertEquals(
    await allAndEverythingRoute(await logger(undefined, { file: false }))(
      ctx,
    ) instanceof
      Context,
    true,
  );
});
