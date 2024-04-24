import { assertEquals, assertNotEquals } from "../../test_deps.ts";
import { encodeHex } from "../deps.ts";
import { createHmacSha, verifyHmacSha } from "./hmac.ts";

const signingInput = "someinput";
const key = "secret";

Deno.test("create and verify hmac", async function (): Promise<void> {
  const signature = await createHmacSha("HS256", key, signingInput);
  const signatureInHex = encodeHex(signature);
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
