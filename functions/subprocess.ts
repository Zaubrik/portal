import { ensureFile } from "./deps.ts";
import { decode } from "./util.ts";
import { getPathnameFs } from "./path.ts";

type CommandOptions = ConstructorParameters<typeof Deno.Command>[1];

/**
 * Run a subprocess https://deno.land/api@v1.34.2?s=Deno.Command
 * ```ts
 * const r1 = await spawnSubprocess("echo", {
 * args: [
 *  "Hello",
 *  "World",
 *  "What is your name?",
 * ],
 * });
 * const r2 = await spawnSubprocess(Deno.execPath(), {
 *   args: ["eval", "console.log('hello'); console.error('world')"],
 * });
 * const r3 = await spawnSubprocess("cat", { args: ["abc.file"] }).catch((err) =>
 *   err.message
 * );
 * ```
 *
 * @param {string | string[]} command
 * @param {{errorMessage?: string; debug?: string} | CommandOptions } options
 * @returns {Promise<string>}
 */
export async function spawnSubprocess(
  command: string | URL,
  options: { errorMessage?: string; debug?: string } & CommandOptions,
): Promise<string> {
  try {
    const cmd = new Deno.Command(command, options);
    const { code, stdout, stderr } = await cmd.output();
    if (code === 0) {
      return decode(stdout);
    } else {
      const err = decode(stderr);
      if (options?.debug) {
        const path = getPathnameFs(new URL(options.debug, Deno.mainModule));
        await ensureFile(path);
        await Deno.writeTextFile(path, `${JSON.stringify([err])},`, {
          append: true,
        });
      }
      throw new Error(
        options?.errorMessage ? options?.errorMessage : err,
      );
    }
  } catch (error) {
    throw error instanceof Error ? error : new Error("[non-error thrown]");
  }
}
