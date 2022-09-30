import { fetchResponse } from "./fetch.ts";
import { Context, createRoute } from "../deps.ts";
import { assertEquals, connInfo } from "../test_deps.ts";

const allAndEverythingRoute = createRoute("ALL")({ pathname: "*" });
const ctx = new Context(new Request(`https://example.com/`), connInfo);

Deno.test("overview", async function () {
  const returnedStatus = await allAndEverythingRoute(
    fetchResponse({ hostname: "_" }),
  )(ctx).catch((error) => error.message);
  assertEquals(
    await returnedStatus,
    "error sending request for url (https://_/): error trying to connect: dns error: failed to lookup address information: Name or service not known",
  );
});
