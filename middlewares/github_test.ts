import { verifyGhWebhook } from "./github.ts";
import { assertEquals } from "../test_deps.ts";

Deno.test("overview", function () {
  assertEquals(typeof verifyGhWebhook, "function");
});
