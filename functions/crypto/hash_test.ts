import { assertEquals } from "../../test_deps.ts";
import { derivePasswordHashWithEncryption } from "./hash.ts";

const isDevelopment = true;

const salt = isDevelopment
  ? new Uint8Array(
    [
      162,
      26,
      151,
      105,
      45,
      179,
      38,
      14,
      141,
      126,
      140,
      6,
      172,
      179,
      235,
      253,
    ],
  )
  : crypto.getRandomValues(new Uint8Array(16));

Deno.test("derivePasswordHashWithEncryption with string", async function (): Promise<
  void
> {
  assertEquals(
    await derivePasswordHashWithEncryption(salt)("abc"),
    "ec980ae156f269b38f3afda63c0f26fc",
  );
});
