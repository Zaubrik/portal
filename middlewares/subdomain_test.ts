import { Context } from "./deps.ts";
import { getSubdomainPath, wwwRedirect } from "./subdomain.ts";
import { assertEquals, connInfo, createRoute } from "../test_deps.ts";

const allAndEverythingRoute = createRoute("ALL")({
  hostname: ":subdomain(www).*",
});
const ctx = new Context(new Request(`https://www.example.com/`), connInfo);

Deno.test("wwwRedirect", async function () {
  const returnedCtx = await allAndEverythingRoute(wwwRedirect)(ctx);
  const returnedLocation = returnedCtx.response.headers.get("location");
  assertEquals(await returnedLocation, "https://example.com/");
});

Deno.test("getSubdomainPath", function () {
  assertEquals(getSubdomainPath(ctx), "www");
});
