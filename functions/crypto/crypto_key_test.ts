import {
  assertEquals,
  assertNotEquals,
  assertRejects,
} from "../../test_deps.ts";
import {
  generateCryptoKey,
  generatePemFromRsaKey,
  importRsaKeyFromPem,
} from "./crypto_key.ts";

Deno.test("generate key and pem and import key", async function (): Promise<
  void
> {
  const { publicKey } = await generateCryptoKey("RS256");
  assertEquals(
    publicKey,
    await importRsaKeyFromPem(
      await generatePemFromRsaKey(publicKey, "public"),
      "RS256",
      "public",
    ),
  );
  assertNotEquals(
    publicKey,
    await importRsaKeyFromPem(
      await generatePemFromRsaKey(publicKey, "public"),
      "RS384",
      "public",
    ),
  );
  assertRejects(
    async () => {
      await importRsaKeyFromPem(
        await generatePemFromRsaKey(publicKey, "public"),
        "RS256",
        "private",
      );
    },
    Error,
    "The pem starts or ends incorrectly.",
  );
});
