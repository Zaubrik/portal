import { assertEquals, assertNotEquals, assertThrows } from "../test_deps.ts";
import { fromFileUrl, join } from "./deps.ts";
import { resolveMainModule, securePath } from "./path.ts";

Deno.test("resolveMainModule", function (): void {
  const relativePath = "./static/script.ts";
  assertEquals(
    resolveMainModule(relativePath),
    join(fromFileUrl(Deno.mainModule), "." + relativePath),
  );
});

Deno.test("securePath", function (): void {
  const rootUrl = new URL("../static/", new URL(import.meta.url));
  const secureStatic = securePath(rootUrl);
  assertEquals(
    securePath("/static/")("./foo.md"),
    fromFileUrl(new URL("file:///" + "/static/foo.md")),
  );
  assertEquals(
    securePath("/static/")("./bar/foo.md"),
    fromFileUrl(new URL("file:///" + "/static/bar/foo.md")),
  );
  assertEquals(
    secureStatic("./foo.md"),
    fromFileUrl(new URL("../static/foo.md", import.meta.url)),
  );
  assertEquals(
    secureStatic("foo.md"),
    fromFileUrl(new URL("../static/foo.md", import.meta.url)),
  );
  assertNotEquals(
    secureStatic("foo.md"),
    fromFileUrl(new URL("./static/foo.md", import.meta.url)),
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
  assertThrows(
    (): void => {
      securePath(new URL("http://example.com/static"))("./foo.md");
    },
    Error,
    "Must be a file URL.",
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
