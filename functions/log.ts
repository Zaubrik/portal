import { join, queue } from "./deps.ts";
import { ensureSymlinkedDataDirectorySync } from "./fs.ts";

/**
 * ```js
 * const log = logTo("server.localhost", "./worker.log");
 * log.next("aaaaaaaaa");
 * log.next("bbbbbbbbb");
 * ```
 */
export function logTo(dirname: string, filename: string) {
  return queue(async (message: string) => {
    const dataPath = join(ensureSymlinkedDataDirectorySync(dirname), filename);
    await Deno.writeTextFile(dataPath, message + "\n", { append: true });
  });
}
