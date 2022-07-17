import { decode } from "../../deps.ts";

/** @typedef {"HS256" | "HS384" | "HS512"} Algorithm */

const encoder = new TextEncoder();

/**
 * Get the correct algorithm.
 * @param {Algorithm} alg
 */
function getAlgorithm(alg) {
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
 * @param {Algorithm} alg
 * @param {string} key
 * @param {string} signingInput
 */
export async function createHmacSha(alg, key, signingInput) {
  const cryptoKey = await crypto.subtle.importKey(
    "raw",
    encoder.encode(key),
    getAlgorithm(alg),
    true,
    ["sign"],
  );
  return new Uint8Array(
    await crypto.subtle.sign(
      getAlgorithm(alg),
      cryptoKey,
      encoder.encode(signingInput),
    ),
  );
}

/**
 * Verify HMAC SHA signature.
 * @param {Uint8Array|string} signature
 * @param {Algorithm} alg
 * @param {string} key
 * @param {string} signingInput
 */
export async function verifyHmacSha(signature, alg, key, signingInput) {
  const cryptoKey = await crypto.subtle.importKey(
    "raw",
    encoder.encode(key),
    getAlgorithm(alg),
    true,
    ["verify"],
  );
  return await crypto.subtle.verify(
    getAlgorithm(alg),
    cryptoKey,
    typeof signature === "string"
      ? decode(encoder.encode(signature))
      : signature,
    encoder.encode(signingInput),
  );
}
