import { assertEquals, assertNotEquals, assertThrows } from "../test_deps.ts";
import { importMetaResolve, securePath } from "./path.ts";

Deno.test("securePath", function (): void {
  const rootUrl = new URL("../static/", new URL(import.meta.url));
  const secureStatic = securePath(rootUrl);
  assertEquals(securePath("/static/")("./foo.md"), "/static/foo.md");
  assertEquals(securePath("/static/")("./bar/foo.md"), "/static/bar/foo.md");
  assertEquals(
    secureStatic("./foo.md"),
    new URL("../static/foo.md", import.meta.url).pathname,
  );
  assertEquals(
    secureStatic("foo.md"),
    new URL("../static/foo.md", import.meta.url).pathname,
  );
  assertNotEquals(
    secureStatic("foo.md"),
    new URL("./static/foo.md", import.meta.url).pathname,
  );
});

Deno.test("securePath with bad rootDirectory", function (): void {
  assertThrows(
    (): void => {
      securePath("static/")("./foo.md");
    },
    Error,
    "The path of 'rootDirectory' is not absolute.",
  );
  assertThrows(
    (): void => {
      securePath("./static/")("./foo.md");
    },
    Error,
    "The path of 'rootDirectory' is not absolute.",
  );
  assertThrows(
    (): void => {
      securePath("/static")("./foo.md");
    },
    Error,
    "The path of 'rootDirectory' is not a directory.",
  );
});

Deno.test("securePath with bad userSuppliedFilename", function (): void {
  const secureStatic = securePath("/static/");
  assertThrows(
    (): void => {
      secureStatic("./f\0oo.md");
    },
    Error,
    "There is a 'poison null byte' in path.",
  );
  assertThrows(
    (): void => {
      secureStatic("../foo.md");
    },
    Error,
    "An unallowed path reversal is in path.",
  );
  assertThrows(
    (): void => {
      secureStatic("./bar/../../foo.md");
    },
    Error,
    "An unallowed path reversal is in path.",
  );
  assertThrows(
    (): void => {
      secureStatic("/foo.md");
    },
    Error,
    "An unallowed path reversal is in path.",
  );
});
