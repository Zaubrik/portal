import { join, resolve } from "./deps.ts";
import { getPathnameFs } from "./path.ts";

export async function getDirEntries(
  pathOrUrl: string | URL,
  ignoreHiddenFiles = true,
): Promise<Deno.DirEntry[]> {
  const dirEntries = [];
  const directory = getPathnameFs(pathOrUrl);
  for await (const dirEntry of Deno.readDir(directory)) {
    if (ignoreHiddenFiles) {
      if (!dirEntry.name.startsWith(".")) dirEntries.push(dirEntry);
    } else {
      dirEntries.push(dirEntry);
    }
  }
  return dirEntries;
}

export async function getFilepaths(
  pathOrUrl: string | URL,
): Promise<string[]> {
  const filepaths = [];
  const directory = getPathnameFs(pathOrUrl);
  for await (const dirEntry of Deno.readDir(directory)) {
    if (dirEntry.isFile) filepaths.push(resolve(directory, dirEntry.name));
  }
  return filepaths;
}

export async function getRecursiveFilepaths(
  pathOrUrl: string | URL,
  ignoreHiddenFiles = true,
): Promise<string[]> {
  let filepaths: string[] = [];
  const directory = getPathnameFs(pathOrUrl);
  const dirEntries = await getDirEntries(directory, ignoreHiddenFiles);
  for await (const dirEntry of dirEntries) {
    if (dirEntry.isFile) filepaths.push(resolve(directory, dirEntry.name));
    if (dirEntry.isDirectory) {
      filepaths = [
        ...filepaths,
        ...await getRecursiveFilepaths(join(directory, dirEntry.name)),
      ];
    }
  }
  return filepaths;
}
