import { resolve } from "./deps.ts";
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

export async function getFilepathsIn(
  pathOrUrl: string | URL,
): Promise<string[]> {
  const directory = getPathnameFs(pathOrUrl);
  const filepaths = [];
  for await (const dirEntry of Deno.readDir(directory)) {
    if (dirEntry.isFile) filepaths.push(resolve(directory, dirEntry.name));
  }
  return filepaths;
}
