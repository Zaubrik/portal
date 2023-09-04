/**
 * generateId
 * Produces a random 8-character hexadecimal string.
 * @returns {string}
 */
export function generateId() {
  const hexString = crypto.getRandomValues(new Uint32Array(1))[0].toString(16);
  return hexString.padStart(8, "0").slice(0, 8);
}

/**
 * generateSalt.
 * @returns {Uint8Array}
 */
export function generateSalt(length = 16) {
  return crypto.getRandomValues(new Uint8Array(length));
}
