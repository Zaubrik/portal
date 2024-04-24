import { extname, fromFileUrl, isAbsolute, join, normalize } from "./deps.ts";
import { decodeUriComponentSafely } from "./url.ts";

/**
 * importMetaResolveFs.
 * @param {string} moduleUrl
 * @return {(path: string) => string}
 * ```ts
 * importMetaResolveFs(import.meta.url)("./static/")
 * ```
 */
export function importMetaResolveFs(moduleUrl: string) {
  if (!moduleUrl.startsWith("file:")) {
    throw new TypeError("Must be a file URL.");
  }
  return (path: string) => getPathnameFs(new URL(path, moduleUrl));
}

/**
 * Takes a `string` or `URL` and returns a pathname.
 * ```ts
 * getPathnameFs(new URL("file:///home/foo")); // "/home/foo"
 * getPathnameFs(new URL("file:///home/fo%o儒")); // /home/fo%o儒
 * getPathnameFs(new URL("http://example.com/books/123")) // /books/123
 * getPathnameFs("file:///home/foo"); // "/home/foo"
 * getPathnameFs(new URL("file:///C:/Users/foo")) // Windows!
 * getPathnameFs("/home/foo"); // "/home/foo"
 * getPathnameFs("./home/foo"); // "./home/foo"
 * ```
 * @param {URL|string} url
 * @return {string}
 */
export function getPathnameFs(urlOrPath: URL | string): string {
  if (typeof urlOrPath === "string") {
    if (isAbsolute(urlOrPath) || urlOrPath.startsWith("./")) {
      return decodeUriComponentSafely(urlOrPath);
    } else {
      return getPathnameFs(new URL(urlOrPath));
    }
  }
  return urlOrPath.protocol === "file:"
    ? decodeUriComponentSafely(fromFileUrl(urlOrPath))
    : decodeUriComponentSafely(urlOrPath.pathname);
}

/**
 * Takes a `string` a pathname to the main module.
 * ```ts
 * resolveMainModule("./home/foo");
 * ```
 * @param {string} relativePath
 * @return {string}
 */
export function resolveMainModule(relativePath: string): string {
  return getPathnameFs(resolveMainModuleToUrl(relativePath));
}

/**
 * Takes a `string` a pathname to the main module.
 * ```ts
 * resolveMainModuleToUrl("./home/foo");
 * ```
 * @param {string} relativePath
 * @return {URL}
 */
export function resolveMainModuleToUrl(relativePath: string): URL {
  return new URL(relativePath, Deno.mainModule);
}

/**
 * Use `securePath` if the path comes from user input or otherwise externally.
 * Adopted from https://nodejs.org/en/knowledge/file-system/security/introduction/
 * ```ts
 * const secureStatic = securePath(new URL("../static/", import.meta.url));
 * const path = secureStatic("./foo.md");
 * const anotherPath = securePath("/aaa/bbb/")(
 * "WEB-COMPONENTS:-ÜBER-DEN-EINZELNEN-BAUSTEIN-HINAUS"
 * )
 * ```
 *
 * @param {string|URL} rootDirectory
 * @return {(userSuppliedFilename: string) => string}
 */
export function securePath(rootDirectory: URL | string) {
  if (typeof rootDirectory === "string") {
    if (!isAbsolute(rootDirectory)) {
      throw new TypeError("The path of 'rootDirectory' is not absolute.");
    }
  }
  const rootDirectoryObj = rootDirectory instanceof URL
    ? rootDirectory
    : new URL("file://" + rootDirectory);
  if (rootDirectoryObj.protocol !== "file:") {
    throw new TypeError("Must be a file URL.");
  }
  rootDirectoryObj.pathname = join(rootDirectoryObj.pathname, "/");
  return (userSuppliedFilename: string): string => {
    if (isSafePath(userSuppliedFilename)) {
      const path = normalize(getPathnameFs(
        new URL(encodeURIComponent(userSuppliedFilename), rootDirectoryObj),
      ));
      if (path.startsWith(getPathnameFs(rootDirectoryObj))) {
        return path;
      } else {
        throw new Error("The path does not start with the root directory.");
      }
    } else {
      throw new Error("There are dangerous patterns inside the path.");
    }
  };
}

/**
 * ```js
 * console.log(isSafePath("/var/www/%2e%2e/etc/passwd")); // false
 * console.log(isSafePath("/var/www/../etc/passwd")); // false
 * console.log(isSafePath("/var/www/.../etc/passwd")); // false
 * console.log(isSafePath("../var/www/../etc/passwd")); // false
 * console.log(isSafePath("/var/www/html/index.html")); // true
 * console.log(isSafePath("./var/www/html/index.html")); // true
 * ```
 */
export function isSafePath(path: string): boolean {
  // Decode URI components to catch encoded traversal sequences
  const decodedPath = decodeURIComponent(path);
  // Check if there is a 'poison null byte' in path.
  if (decodedPath.indexOf("\0") !== -1) {
    return false;
  }
  // Regular expression to match path traversal patterns like '..', '/..', '\..', '%2e%2e', etc.
  const traversalPattern = /(\.\.\/)|(\.\.\\)|%2e%2e|\/\.\.|\.\.$/i;

  // Check if the decoded path matches the traversal pattern
  return !traversalPattern.test(decodedPath);
}

export function hasExtension(extension: string) {
  return (pathOrUrl: string | URL): pathOrUrl is string => {
    const filepath = getPathnameFs(pathOrUrl);
    return extname(filepath) === extension;
  };
}
