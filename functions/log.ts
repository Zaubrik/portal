import { basename, dirname, isUrl, join, queue } from "./deps.ts";
import { ensureSymlinkedDataDirectorySync } from "./fs.ts";

/**
 * ```js
 * const log = logTo("server.localhost", "./worker.log");
 * log.next("aaaaaaaaa");
 * log.next("bbbbbbbbb");
 * ```
 */
export function logTo(path: string | URL) {
  const dataPath = isUrl(path)
    ? path
    : join(ensureSymlinkedDataDirectorySync(dirname(path)), basename(path));
  return queue(async (message: string) => {
    await Deno.writeTextFile(dataPath, message + "\n", { append: true });
  });
}
