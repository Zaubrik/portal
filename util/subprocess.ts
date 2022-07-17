import { isError, isString } from "../sorcery/type.js";
import { decode } from "../sorcery/encoding.js";
import { ensureFile } from "../deps.ts";

/**
 * Run a subprocess with the `piped` option.
 * https://deno.land/manual/examples/subprocess
 * ```ts
 * await runWithPipes(["echo", "Hello"]);
 * await runWithPipes("echo Hello"]);
 * ```
 *
 * @param {string | string[]} command
 * @param {{errorMessage?: string; debug?: string}} options
 * @returns {Promise<string>}
 */
export async function runWithPipes(
  command: string | string[],
  { errorMessage, debug }: { errorMessage?: string; debug?: string } = {},
): Promise<string> {
  try {
    const cmd = Array.isArray(command) ? command : command.split(" ");
    const p = Deno.run({ cmd, stdout: "piped", stderr: "piped" });
    const status = await p.status();
    // Reading the outputs closes their pipes
    const rawOutput = await p.output();
    const rawError = await p.stderrOutput();
    if (status.code === 0) {
      return decode(rawOutput);
    } else {
      const err = decode(rawError);
      if (debug) {
        await ensureFile(debug);
        await Deno.writeTextFile(debug, `${JSON.stringify([err])},`, {
          append: true,
        });
      }
      throw new Error(
        isString(errorMessage) ? errorMessage : err,
      );
    }
  } catch (err) {
    throw isError(err) ? err : new Error("[non-error thrown]");
  }
}
