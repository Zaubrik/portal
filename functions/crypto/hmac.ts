import { decodeFromHexString, encode } from "../util.ts";
import { type HsAlgorithm } from "./crypto_key.ts";

/**
 * Get the correct algorithm.
 * @param {HsAlgorithm} alg
 */
function getAlgorithm(alg: HsAlgorithm) {
  switch (alg) {
    case "HS256":
      return { hash: { name: "SHA-256" }, name: "HMAC" };
    case "HS384":
      return { hash: { name: "SHA-384" }, name: "HMAC" };
    case "HS512":
      return { hash: { name: "SHA-512" }, name: "HMAC" };
    default:
      throw new Error(`The jwt's alg '${alg}' is not supported.`);
  }
}

/**
 * Create HMAC SHA signature.
 * @param {HsAlgorithm} alg
 * @param {string} key
 * @param {string} signingInput
 * @return {Promise<Uint8Array>}
 */
export async function createHmacSha(
  alg: HsAlgorithm,
  key: string,
  signingInput: string,
): Promise<Uint8Array> {
  const cryptoKey = await crypto.subtle.importKey(
    "raw",
    encode(key),
    getAlgorithm(alg),
    true,
    ["sign"],
  );
  return new Uint8Array(
    await crypto.subtle.sign(
      getAlgorithm(alg),
      cryptoKey,
      encode(signingInput),
    ),
  );
}

/**
 * Verify HMAC SHA signature.
 * @param {Uint8Array|string} signature
 * @param {HsAlgorithm} alg
 * @param {string} key
 * @param {string} signingInput
 * @return {Promise<Boolean>}
 */
export async function verifyHmacSha(
  signature: Uint8Array | string,
  alg: HsAlgorithm,
  key: string,
  signingInput: string,
): Promise<boolean> {
  const cryptoKey = await crypto.subtle.importKey(
    "raw",
    encode(key),
    getAlgorithm(alg),
    true,
    ["verify"],
  );
  return await crypto.subtle.verify(
    getAlgorithm(alg),
    cryptoKey,
    typeof signature === "string" ? decodeFromHexString(signature) : signature,
    encode(signingInput),
  );
}
