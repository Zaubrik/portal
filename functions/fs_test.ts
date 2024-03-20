import { assertEquals, assertThrows } from "../test_deps.ts";
import { join } from "./deps.ts";
import {
  ensureSymlinkedDataDirectorySync,
  ensureSymlinkedDirectorySync,
  existsSync,
} from "./fs.ts";
import { getPathnameFs, resolveMainModule } from "./path.ts";

function cleanup(dir: string) {
  if (existsSync(dir)) {
    Deno.removeSync(dir, { recursive: true });
  }
}

Deno.test("Creates a symlink between existing directories", () => {
  const sourceDir = Deno.makeTempDirSync();
  const targetDir = resolveMainModule("./.tmp");
  const result = ensureSymlinkedDirectorySync(sourceDir, targetDir, {});
  assertEquals(existsSync(targetDir), true, "Target directory should exist");
  assertEquals(
    Deno.lstatSync(targetDir).isSymlink,
    true,
    "Target should be a symlink",
  );
  assertEquals(result, targetDir);

  cleanup(sourceDir);
  cleanup(targetDir);
});

Deno.test("Does not throw if the target is already a symlink", () => {
  const sourceDir = Deno.makeTempDirSync();
  const targetDir = resolveMainModule("./.tmp");
  Deno.symlinkSync(sourceDir, targetDir);
  ensureSymlinkedDirectorySync(sourceDir, targetDir);
  const result = ensureSymlinkedDirectorySync(sourceDir, targetDir);
  assertEquals(result, targetDir);

  cleanup(sourceDir);
  cleanup(targetDir);
});

Deno.test("Throws an error if the source directory does not exist", () => {
  const targetDir = resolveMainModule("./.tmp");
  const nonExistentDir = resolveMainModule("./.temp2");
  const result = ensureSymlinkedDirectorySync(nonExistentDir, targetDir);
  assertEquals(result, getPathnameFs(targetDir));
  assertEquals(
    existsSync(nonExistentDir),
    true,
  );
  assertEquals(
    Deno.lstatSync(nonExistentDir).isDirectory,
    true,
  );
  assertEquals(
    Deno.lstatSync(targetDir).isSymlink,
    true,
  );
  cleanup(nonExistentDir);
  cleanup(targetDir);
});

Deno.test("Correctly handles subdirectory creation in the symlinked directory", () => {
  const sourceDir = Deno.makeTempDirSync();
  const targetDir = resolveMainModule("./.tmp");
  const subDirName = "subdir";

  const resultPath = ensureSymlinkedDirectorySync(sourceDir, targetDir, {
    subDirectory: subDirName,
  });
  assertEquals(
    existsSync(resultPath),
    true,
    "Subdirectory should exist within the symlinked directory",
  );
  assertEquals(
    resultPath,
    join(targetDir, subDirName),
  );

  cleanup(sourceDir);
  cleanup(targetDir);
});

Deno.test("Throws an error when the source is not a directory", () => {
  const sourceDir = Deno.makeTempDirSync();
  const targetDir = resolveMainModule("./.tmp");
  // Creating a file instead of a directory
  const filePath = `${sourceDir}/file.txt`;
  Deno.writeTextFileSync(filePath, "Hello, Deno!");
  assertThrows(
    () => ensureSymlinkedDirectorySync(filePath, targetDir, {}),
    Error,
  );

  cleanup(sourceDir);
  cleanup(targetDir);
});

Deno.test("Creates a symlink between parent and child directory", () => {
  const sourceDir = resolveMainModule("../.data");
  const targetDir = resolveMainModule("./.data");
  const subdirectory = "dir";
  const result = ensureSymlinkedDataDirectorySync(subdirectory);
  assertEquals(existsSync(targetDir), true);
  assertEquals(Deno.lstatSync(targetDir).isSymlink, true);
  assertEquals(result, join(targetDir, subdirectory));

  cleanup(targetDir);
  cleanup(sourceDir);
});
