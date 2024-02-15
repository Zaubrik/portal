import { basename, join, normalize, resolve } from "./deps.ts";
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

export async function isDirectory(path: string): Promise<boolean> {
  try {
    const fileInfo = await Deno.lstat(path);
    return fileInfo.isDirectory;
  } catch {
    return false;
  }
}

export async function isFile(path: string): Promise<boolean> {
  try {
    const fileInfo = await Deno.stat(path);
    return fileInfo.isFile;
  } catch (error) {
    console.error("Error checking the path:", error);
    return false;
  }
}

export function ensureDirAndSymlink(containerPath: string) {
  const container = basename(containerPath);
  try {
    const fileInfo = Deno.lstatSync(containerPath);
    if (!fileInfo.isDirectory && !fileInfo.isSymlink) {
      throw new Error(
        `The container has the wrong file type.`,
      );
    }
  } catch {
    const parentContainer = normalize(containerPath + "/../../" + container);
    try {
      const fileInfo = Deno.lstatSync(parentContainer);
      if (!fileInfo.isDirectory) {
        throw new Error(
          `The parent container has the wrong file type.`,
        );
      }
      Deno.symlinkSync(parentContainer, containerPath);
      console.log(
        `Creating a symlink from ${parentContainer} to ${containerPath}.`,
      );
    } catch {
      // It needs the `--unstable` flag at the moment:
      // Deno.umask(0);
      Deno.mkdirSync(parentContainer, { recursive: true });
      Deno.symlinkSync(parentContainer, containerPath);
      console.log(
        `Creating a symlink from ${parentContainer} to ${containerPath}.`,
      );
    }
  }
}
