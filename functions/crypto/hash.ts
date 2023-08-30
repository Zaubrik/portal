import { decodeFromHexString, encode, encodeToHexString } from "../util.ts";
import { safeCompare } from "./comparison.ts";

type HashOptions = { iterations?: number; keyLength?: number };

/**
 * In summary, PBKDF2 is used to derive a key from a password and salt, making it
 * computationally expensive for an attacker to guess the password. The derived
 * key is then used with AES-GCM, an authenticated encryption algorithm, to
 * encrypt and decrypt data securely while providing integrity and authentication
 * checks.
 * With same input, the derived hashs are identical.
 */
export async function derivePasswordHashWithEncryption(
  password: string | Uint8Array,
  salt: Uint8Array,
  {
    iterations = 10000, // number of iterations
    keyLength = 128, // length of key in bits
  }: HashOptions = {},
): Promise<Uint8Array> {
  const encodedPassword = typeof password === "string"
    ? encode(password)
    : password;
  const baseKey = await crypto.subtle.importKey(
    "raw",
    encodedPassword,
    { name: "PBKDF2" },
    false,
    ["deriveKey"],
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
  return passwordHash;
}

export async function generateSecret(
  password: string | Uint8Array,
  salt: Uint8Array,
): Promise<string> {
  return appendSaltToHash(
    await derivePasswordHashWithEncryption(password, salt),
    salt,
  );
}

export function appendSaltToHash(
  hash: Uint8Array,
  salt: Uint8Array,
  separator = "$",
) {
  return encodeToHexString(hash) + separator + encodeToHexString(salt);
}

export async function comparePassword(
  hashAndSalt: string,
  password: string,
  separator = "$",
): Promise<boolean> {
  const [hash, saltString] = hashAndSalt.split(separator);
  const salt = decodeFromHexString(saltString);
  const newHash = encodeToHexString(
    await derivePasswordHashWithEncryption(password, salt),
  );
  return safeCompare(hash, newHash);
}
