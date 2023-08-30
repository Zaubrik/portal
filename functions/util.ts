import { decodeFromHex, encodeToHex } from "./deps.ts";

const encoder = new TextEncoder();
const decoder = new TextDecoder();

/**
 * Encodes as `string` into a `Uint8Array`.
 * @param {string} str
 * @returns {Uint8Array}
 */
export function encode(str: string) {
  return encoder.encode(str);
}

/**
 * Decodes as `Uint8Array` into a `string`.
 * @param {Uint8Array} uint8Array
 * @returns {string}
 */
export function decode(unint8Array: Uint8Array) {
  return decoder.decode(unint8Array);
}

export function encodeToHexString(uint8Array: Uint8Array): string {
  return decode(encodeToHex(uint8Array));
}

export function decodeFromHexString(str: string): Uint8Array {
  return decodeFromHex(encode(str));
}
