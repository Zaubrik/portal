import { setXResponseTime, StartState, startTime } from "./time.ts";
import { Context, createRoute } from "../deps.ts";
import { assertEquals, connInfo } from "../test_deps.ts";

const allAndEverythingRoute = createRoute("ALL")({ pathname: "*" });
const ctx = new Context<StartState>(
  new Request(`https://example.com/`),
  connInfo,
);

Deno.test("overview", async function () {
  const returnedCtx = await allAndEverythingRoute(
    setXResponseTime,
    startTime,
  )(ctx);
  assertEquals(
    typeof returnedCtx.response.headers.get("X-Response-Time") === "string",
    true,
  );
});
