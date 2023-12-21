/**
 * Removes falsey values. Copy/import it from sorcery?
 * https://github.com/robertmassaioli/ts-is-present/blob/master/src/index.ts
 * ```js
 * const foo: = [2,3, null, 4];
 * const bar = foo.filter(isPresent); // number[]
 * ```
 * @template T
 * @param {T|undefined|null} input
 * @returns {input is T}
 */
export function isPresent<T>(input: T | undefined | null): input is T {
  return input !== undefined && input !== null;
}

export function assertEnv(env: string[]): string[] {
  const result = env.map((v) => Deno.env.get(v)).filter(isPresent);
  if (result.length !== env.length) {
    throw new Error(
      `Not all environment variables are defined for: ${env.join(", ")}.`,
    );
  } else {
    return result;
  }
}

export const isProduction = JSON.parse(
  Deno.env.get("IS_PRODUCTION") ?? "false",
);
