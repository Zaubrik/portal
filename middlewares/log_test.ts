import { Portal } from "../portal.ts";
import { logger } from "./log.ts";
import { log } from "./deps.ts";
import { assertEquals, getResponseTextFromApp } from "../test_deps.ts";

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

Deno.test("[log] confirm return type void", async function () {
  const app = new Portal();
  const getResponseText = getResponseTextFromApp(app);
  app.get(
    { pathname: "/books" },
    (_ctx) => new Response("Hello World"),
    await logger(logConfig),
  );
  assertEquals(
    await getResponseText(new Request("https://www.example.com/books")),
    "Hello World",
  );
});
