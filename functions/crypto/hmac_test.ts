import { assertEquals, assertNotEquals } from "../../test_deps.ts";
import { encodeToHex } from "../deps.ts";
import { createHmacSha, verifyHmacSha } from "./hmac.ts";

const signingInput = "someinput";
const key = "secret";
const decoder = new TextDecoder();

Deno.test("create and verify hmac", async function (): Promise<void> {
  const signature = await createHmacSha("HS256", key, signingInput);
  const signatureInHex = decoder.decode(encodeToHex(signature));
  assertEquals(
    await verifyHmacSha(signature, "HS256", key, signingInput),
    true,
  );
  assertEquals(
    await verifyHmacSha(signatureInHex, "HS256", key, signingInput),
    true,
  );
  assertNotEquals(
    await verifyHmacSha(signatureInHex, "HS256", "wrong", signingInput),
    true,
  );
  assertNotEquals(
    await verifyHmacSha(signatureInHex, "HS384", key, signingInput),
    true,
  );
});
