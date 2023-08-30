import { assertEquals } from "../../test_deps.ts";
import { comparePassword, generateSecret } from "./hash.ts";
import { generateSalt } from "./randomization.ts";

Deno.test("derivePasswordHashWithEncryption with string", async function (): Promise<
  void
> {
  const password = "secret";
  const salt = await generateSalt();
  const hashAndSalt = await generateSecret(password, salt);
  const areEqual = await comparePassword(hashAndSalt, password);
  assertEquals(
    areEqual,
    true,
  );
});
