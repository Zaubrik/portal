import { logger } from "./log.ts";
import { log } from "../deps.ts";
import { assertEquals, connInfo, Context, createRoute } from "../test_deps.ts";

const logConfig = {
  handlers: {
    console: new log.handlers.ConsoleHandler("CRITICAL", {
      formatter: "{msg}",
    }),
  },
  loggers: {
    default: {
      level: "DEBUG" as const,
      handlers: ["console"],
    },
  },
};

const allAndEverythingRoute = createRoute("ALL")({ pathname: "*" });
const ctx = new Context(new Request("https://example.com/books/123"), connInfo);

Deno.test("Overview", async function () {
  assertEquals(
    await allAndEverythingRoute(await logger(logConfig))(ctx) instanceof
      Context,
    true,
  );
});
