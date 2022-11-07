import { fetchResponse } from "./fetch.ts";
import { assertEquals, connInfo, Context, createRoute } from "../test_deps.ts";

const allAndEverythingRoute = createRoute("ALL")({ pathname: "*" });
const ctx = new Context(new Request(`https://example.com/`), connInfo);

Deno.test("overview", async function () {
  const returnedStatus = await allAndEverythingRoute(
    fetchResponse({ hostname: "_" }),
  )(ctx).catch((error) => error);
  assertEquals(returnedStatus instanceof Error, true);
});
