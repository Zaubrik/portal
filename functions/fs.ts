import { getPathnameFs } from "./path.ts";

export async function getDirEntries(
  pathOrUrl: string | URL,
): Promise<Deno.DirEntry[]> {
  const directory = getPathnameFs(pathOrUrl);
  const dirEntries = [];
  for await (const dirEntry of Deno.readDir(directory)) {
    dirEntries.push(dirEntry);
  }
  return dirEntries;
}
