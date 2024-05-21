import { basename, dirname, join, queue } from "./deps.ts";
import { ensureSymlinkedDataDirectorySync } from "./fs.ts";

/**
 * ```js
 * const log = logTo("./server.localhost/worker.log");
 * log.next("aaaaaaaaa");
 * log.next("bbbbbbbbb");
 * ```
 */
export function logTo(path: string | URL) {
  return queue(async (message: string) => {
    await Deno.writeTextFile(path, message + "\n", { append: true });
  });
}

export function logToSymlinkedData(relativeFilepath: string) {
  return logTo(
    join(
      ensureSymlinkedDataDirectorySync(dirname(relativeFilepath)),
      basename(relativeFilepath),
    ),
  );
}
