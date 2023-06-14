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
