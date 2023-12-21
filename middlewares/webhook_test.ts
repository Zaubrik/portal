import { addWebhookPayloadToState } from "./webhook.ts";
import { assertEquals } from "../test_deps.ts";

Deno.test("overview", function () {
  assertEquals(typeof addWebhookPayloadToState, "function");
});
