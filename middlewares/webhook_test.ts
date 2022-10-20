import { verifyWebhook } from "./webhook.ts";
import { assertEquals } from "../test_deps.ts";

Deno.test("overview", function () {
  assertEquals(typeof verifyWebhook, "function");
});
