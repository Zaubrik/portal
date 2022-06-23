import { fromFileUrl } from "./deps.ts";

/**
 * Takes a `string` or `URL` and returns a pathname.
 * ```js
 * getPathname(new URL("file:///home/foo")); // "/home/foo"
 * getPathname("file:///home/foo"); // "/home/foo"
 * getPathname("/home/foo"); // "/home/foo"
 * getPathname("./home/foo"); // "./home/foo"
 * ```
 * @param {URL|string} url
 * @return {string}
 */
export function getPathname(url: URL | string): string {
  if (typeof url === "string") {
    if (url.startsWith("/") || url.startsWith("./")) {
      return url;
    } else {
      return fromFileUrl(new URL(url));
    }
  }
  return fromFileUrl(url);
}

/**
 * importMetaResolve.
 *
 * @param {string} moduleUrl
 * @return {(path: string) => string}
 * ```js
 * importMetaResolve(import.meta.url)("./static/")
 * ```
 */
export function importMetaResolve(moduleUrl: string) {
  return (path: string) => getPathname(new URL(path, moduleUrl));
}

/**
 * securePath.
 * Adopted from https://nodejs.org/en/knowledge/file-system/security/introduction/
 *
 * ```ts
 * const secureStatic = securePath(new URL("../static/", import.meta.url));
 * const path = secureStatic("./foo.md");
 * ```
 *
 * @param {string|URL} rootDirectory
 * @return {(userSuppliedFilename: string) => string}
 */
export function securePath(rootDirectory: URL | string) {
  if (typeof rootDirectory === "string") {
    if (rootDirectory[0] !== "/") {
      throw new TypeError("The path of 'rootDirectory' is not absolute.");
    }
  }
  const rootDirectoryObj = rootDirectory instanceof URL
    ? rootDirectory
    : new URL("file://" + rootDirectory);
  if ((rootDirectoryObj.pathname.slice(-1) !== "/")) {
    throw new TypeError("The path of 'rootDirectory' is not a directory.");
  }
  return (userSuppliedFilename: string): string => {
    if (userSuppliedFilename.indexOf("\0") !== -1) {
      throw new Error("There is a 'poison null byte' in path.");
    }
    const path = getPathname(
      new URL(userSuppliedFilename, rootDirectoryObj),
    );
    if (!path.startsWith(getPathname(rootDirectoryObj))) {
      throw new Error("An unallowed path reversal is in path.");
    }

    return path;
  };
}
