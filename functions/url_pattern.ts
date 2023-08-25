export type UrlProperties = Partial<Omit<URL, "origin" | "searchParams">>;
export type UrlPatternInput = string | UrlProperties;

/**
 * Takes an `URLPattern` and returns a function which takes a `URL` or object of
 * URL parts (or an array of both) and *tests* the urls against the URLPattern.
 * ```js
 * const urls = [
 *   "http://example.com",
 *   "http://example.com/",
 *   "http://example.com/books",
 *   "http://example.com/books/",
 *   "http://example.com/books/one",
 * ];
 * // Matches paths going further than just '/'.
 * const pattern1 = new URLPattern({ pathname: "/(.+)" });
 * // Matches all paths from the 'books' directory.
 * const pattern2 = new URLPattern({ pathname: "/books{/*}?" });
 * // Groups second-level domain with optional subdomain:
 * const pattern3 = new URL({
 *   hostname: `{:subdomain.}*:secondLevelDomain(localhost|${domain})`,
 * });
 * console.log(testUrlPattern(pattern1)(urls));
 * ```
 * @param {URLPattern | UrlPatternInput} pattern
 * @param {boolean} [expectTrue=true]
 */
export function testUrlPattern(
  pattern: URLPattern | URLPatternInput,
  expectTrue = true,
) {
  const urlPattern = pattern instanceof URLPattern
    ? pattern
    : new URLPattern(pattern);
  return (...urlInputArray: UrlPatternInput[] | [UrlPatternInput[]]) =>
    urlInputArray.flat().every((input) =>
      urlPattern.test(input) === expectTrue ? true : false
    );
}

/**
 * Takes an `URLPattern` and returns a function which takes a `URL` or object of
 * URL parts (or an array of both) and *executes* the urls against the URLPattern.
 * @param {URLPattern | UrlPatternInput} pattern
 */
export function execUrlPattern(pattern: URLPattern | URLPatternInput) {
  const urlPattern = pattern instanceof URLPattern
    ? pattern
    : new URLPattern(pattern);
  return (urlInputArray: UrlPatternInput[] | [UrlPatternInput[]]) =>
    urlInputArray.flat().map((input) => urlPattern.exec(input));
}

/**
 * Get a certain group of a URLPatternResult.
 * @param {URLPatternResult} urlPatternResult
 * @param {string} urlPart
 * @param {string} group
 * @return {string}
 */
export function getGroup(
  urlPatternResult: URLPatternResult,
  urlPart: Exclude<keyof URLPatternResult, "input">,
  group: string,
): string {
  // deno-lint-ignore no-explicit-any
  const groups = (urlPatternResult as any)[urlPart].groups;
  const param = groups[group];
  if (param === undefined) {
    throw new Error(
      `The matching group in ${urlPart} for ${group} is 'undefined'.`,
    );
  }
  return param;
}
