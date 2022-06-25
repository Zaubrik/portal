/**
 * https://github.com/microsoft/TypeScript/issues/1897
 */
export type JsonPrimitive = string | number | boolean | null;
export type JsonObject = { [member: string]: JsonValue };
export type JsonArray = JsonValue[];
export type JsonValue = JsonPrimitive | JsonObject | JsonArray;

/**
 * Takes a path and converts its content, separated by a `,`, to an `Array`. The
 * file content must have a format like this:
 * ```
 * {"a":10,"b":20,"c":30},{"a":10,"b":20,"c":30},
 * ```
 * @param {string|URL} path
 * @returns {Promise<JsonValue[]>}
 */
async function parseFakeJson(path: string | URL): Promise<JsonValue[]> {
  const content = (await Deno.readTextFile(path)).trim();
  const contentWithoutTrailingComma = content.endsWith(",")
    ? content.slice(0, -1)
    : content;
  return JSON.parse(`[${contentWithoutTrailingComma}]`);
}
