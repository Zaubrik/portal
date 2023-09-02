import { assertEquals } from "../test_deps.ts";
import { createJwt, verifyJwt } from "./jwt.ts";

const { privateKey, publicKey } = await window.crypto.subtle.generateKey(
  {
    name: "RSASSA-PKCS1-v1_5",
    modulusLength: 4096,
    publicExponent: new Uint8Array([1, 0, 1]),
    hash: "SHA-384",
  },
  true,
  ["verify", "sign"],
);

const payload = { iss: "zaubrik" };
const verify = await verifyJwt(publicKey);

Deno.test("Create and verify a jwt", async function (): Promise<void> {
  const jwt = await createJwt(payload, privateKey);
  const verifiedPayload = await verify(jwt);
  assertEquals(verifiedPayload, payload);
});
