/**
 * generateId.
 * @returns {string}
 */
export function generateId() {
  return crypto.getRandomValues(new Uint32Array(1))[0].toString(16);
}

/**
 * generateSalt.
 * @returns {Uint8Array}
 */
export function generateSalt(length = 16) {
  return crypto.getRandomValues(new Uint8Array(length));
}
