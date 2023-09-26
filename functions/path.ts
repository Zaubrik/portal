import { extname, fromFileUrl, isAbsolute } from "./deps.ts";
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
    ? fromFileUrl(urlOrPath)
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
  return getPathnameFs(new URL(relativePath, Deno.mainModule));
}

/**
 * Use `securePath` if the path comes from user input or otherwise externally.
 * Adopted from https://nodejs.org/en/knowledge/file-system/security/introduction/
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
  if (rootDirectoryObj.protocol !== "file:") {
    throw new TypeError("Must be a file URL.");
  }
  if ((rootDirectoryObj.pathname.slice(-1) !== "/")) {
    throw new TypeError("The path of 'rootDirectory' is not a directory.");
  }
  return (userSuppliedFilename: string): string => {
    if (userSuppliedFilename.indexOf("\0") !== -1) {
      throw new Error("There is a 'poison null byte' in path.");
    }
    const path = getPathnameFs(
      new URL(userSuppliedFilename, rootDirectoryObj),
    );
    if (!path.startsWith(getPathnameFs(rootDirectoryObj))) {
      throw new Error("An unallowed path reversal is in path.");
    }

    return path;
  };
}

export function hasExtension(extension: string) {
  return (pathOrUrl: string | URL): boolean => {
    const filepath = getPathnameFs(pathOrUrl);
    return extname(filepath) === extension;
  };
}
