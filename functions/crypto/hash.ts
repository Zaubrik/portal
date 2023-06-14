import { encodeToHex } from "../deps.ts";
import { decode, encode } from "../util.ts";

/**
 * In summary, PBKDF2 is used to derive a key from a password and salt, making it
 * computationally expensive for an attacker to guess the password. The derived
 * key is then used with AES-GCM, an authenticated encryption algorithm, to
 * encrypt and decrypt data securely while providing integrity and authentication
 * checks.
 * With same input, the derived hashs are identical.
 */
export function derivePasswordHashWithEncryption(salt: Uint8Array) {
  return async (password: string | Uint8Array, {
    iterations = 10000, // number of iterations
    keyLength = 128, // length of key in bits
  }: { iterations?: number; keyLength?: number } = {}): Promise<string> => {
    const encodedPassword = typeof password === "string"
      ? encode(password)
      : password;
    const baseKey = await crypto.subtle.importKey(
      "raw",
      encodedPassword,
      { name: "PBKDF2" },
      false,
      // deriveBits is obsolete: https://github.com/denoland/deno/issues/14693
      ["deriveKey", "deriveBits"],
    );
    const key = await crypto.subtle.deriveKey(
      {
        "name": "PBKDF2",
        salt,
        "iterations": iterations,
        "hash": "SHA-256",
      },
      baseKey,
      { "name": "AES-GCM", "length": keyLength },
      true,
      ["encrypt", "decrypt"],
    );
    const keyData = await crypto.subtle.exportKey("raw", key);
    const passwordHash = new Uint8Array(keyData);
    return decode(encodeToHex(passwordHash));
  };
}
