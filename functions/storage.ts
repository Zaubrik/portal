import { getRecursiveFilepaths } from "./fs.ts";

/**
 * calculateDirectorySize
 * ```ts
 * import { resolveMainModule } from "./path.ts";
 * console.log(await calculateDirectorySize(resolveMainModule("./")));
 * ```
 */
export async function calculateDirectorySize(
  directoryPath: string,
): Promise<number> {
  const paths = await getRecursiveFilepaths(directoryPath);
  const sizes = await Promise.all(
    paths.map(async (path) => (await Deno.stat(path)).size),
  );
  const totalSize = sizes.reduce((acc, val) => acc + val, 0);
  return totalSize;
}
