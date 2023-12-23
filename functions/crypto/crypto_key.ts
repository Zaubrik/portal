import { base64, isString } from "../deps.ts";

export type RsaAlgorithm = "RS256" | "RS384" | "RS512";
export type HsAlgorithm = "HS256" | "HS384" | "HS512";
export type Algorithm = RsaAlgorithm | HsAlgorithm;

export function isCryptoKey(input: unknown): input is CryptoKey {
  return input instanceof CryptoKey;
}

export function isHsAlgorithm(input: unknown): input is HsAlgorithm {
  const hsAlgorithms: HsAlgorithm[] = ["HS256", "HS384", "HS512"];
  return isString(input) && hsAlgorithms.includes(input as HsAlgorithm);
}

export function isRsaAlgorithm(input: unknown): input is RsaAlgorithm {
  const rsaAlgorithms: RsaAlgorithm[] = ["RS256", "RS384", "RS512"];
  return isString(input) && rsaAlgorithms.includes(input as RsaAlgorithm);
}

export function getAlgorithm(
  alg: Algorithm,
): HmacKeyGenParams | RsaHashedKeyGenParams {
  switch (alg) {
    case "HS256":
      return { hash: { name: "SHA-256" }, name: "HMAC" };
    case "HS384":
      return { hash: { name: "SHA-384" }, name: "HMAC" };
    case "HS512":
      return { hash: { name: "SHA-512" }, name: "HMAC" };
    case "RS256":
      return {
        name: "RSASSA-PKCS1-v1_5",
        modulusLength: 4096,
        publicExponent: new Uint8Array([1, 0, 1]),
        hash: "SHA-256",
      };
    case "RS384":
      return {
        name: "RSASSA-PKCS1-v1_5",
        modulusLength: 4096,
        publicExponent: new Uint8Array([1, 0, 1]),
        hash: "SHA-384",
      };
    case "RS512":
      return {
        name: "RSASSA-PKCS1-v1_5",
        modulusLength: 4096,
        publicExponent: new Uint8Array([1, 0, 1]),
        hash: "SHA-512",
      };
    default:
      throw new Error(`The jwt's alg '${alg}' is not supported.`);
  }
}

/**
 * A simple wrapper for `window.crypto.subtle.generateKey`. It takes an
 * `Algorithm` and returns a `CryptoKey` or `CryptoKeyPair`.
 */
export async function generateCryptoKey(alg: HsAlgorithm): Promise<CryptoKey>;
export async function generateCryptoKey(
  alg: RsaAlgorithm,
): Promise<CryptoKeyPair>;
export async function generateCryptoKey(alg: Algorithm) {
  const keyGeneratingParams = getAlgorithm(alg);
  return await window.crypto.subtle.generateKey(
    keyGeneratingParams,
    true,
    ["verify", "sign"],
  );
}

export async function generatePemFromRsaKey(
  cryptoKey: CryptoKey,
  kind: "public" | "private",
) {
  const format = kind === "private" ? "pkcs8" : "spki";
  const exportedKey = await crypto.subtle.exportKey(format, cryptoKey);
  const exportedAsBase64 = base64.encode(exportedKey);
  return `-----BEGIN ${kind.toUpperCase()} KEY-----\n${exportedAsBase64}\n-----END ${kind.toUpperCase()} KEY-----`;
}

/**
 * Imports a PEM encoded RSA private key, to use for RSA-PSS signing.
 * Takes a string containing the PEM encoded key, and returns a Promise
 * that will resolve to a CryptoKey representing the private key.
 */
export async function importRsaKeyFromPem(
  pem: string,
  alg: RsaAlgorithm,
  kind: "public" | "private",
): Promise<CryptoKey> {
  const kindInUpperCase = kind.toUpperCase();
  // fetch the part of the PEM string between header and footer
  const pemHeader = `-----BEGIN ${kindInUpperCase} KEY-----`;
  const pemFooter = `-----END ${kindInUpperCase} KEY-----`;
  const regex = new RegExp(`^${pemHeader}.+${pemFooter}$`, "s");
  if (!regex.test(pem)) {
    throw new Error("The pem starts or ends incorrectly.");
  }
  const pemContents = pem.substring(
    pemHeader.length,
    pem.length - pemFooter.length,
  );
  const pemBuffer = base64.decode(pemContents).buffer;
  const format = kind === "private" ? "pkcs8" : "spki";
  return await window.crypto.subtle.importKey(
    format,
    pemBuffer,
    getAlgorithm(alg),
    true,
    kind === "private" ? ["sign"] : ["verify"],
  );
}

/**
 * Takes a `keyUrl` and an `RsaAlgorithm` and returns the fetched public `CryptoKey`.
 */
export async function fetchRsaCryptoKey(
  keyUrl: string | URL,
  algorithm: RsaAlgorithm,
): Promise<CryptoKey> {
  const response = await fetch(keyUrl);
  if (response.ok) {
    const pem = await response.text();
    return await importRsaKeyFromPem(pem, algorithm, "public");
  } else {
    throw new Error(
      `Received status code ${response.status} (${response.statusText}) instead of 200-299 range`,
    );
  }
}
