import { basename, join, normalize, resolve } from "./deps.ts";
import { getPathnameFs, resolveMainModule, securePath } from "./path.ts";

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

export function ensureSymlinkedDirectory(
  directory: URL | string,
  subDirectory?: string,
): string {
  const containerPath = getPathnameFs(directory);
  const container = basename(containerPath);
  let containerIsSymlink = false;
  try {
    containerIsSymlink = Deno.lstatSync(containerPath).isSymlink;
  } catch {
    const parentContainer = normalize(containerPath + "/../../" + container);
    try {
      const parentFileInfo = Deno.lstatSync(parentContainer);
      if (!parentFileInfo.isDirectory) {
        throw new Error(
          `The parent container ${parentContainer} has the wrong file type.`,
        );
      }
      Deno.symlinkSync(parentContainer, containerPath);
      containerIsSymlink = Deno.lstatSync(containerPath).isSymlink;
      console.log(
        `Creating a symlink from ${parentContainer} to ${containerPath}.`,
      );
    } catch {
      // It needs the `--unstable` flag at the moment:
      // Deno.umask(0);
      Deno.mkdirSync(parentContainer, { recursive: true });
      Deno.symlinkSync(parentContainer, containerPath);
      containerIsSymlink = Deno.lstatSync(containerPath).isSymlink;
      console.log(
        `Creating a symlink from ${parentContainer} to ${containerPath}.`,
      );
    }
  }
  if (!containerIsSymlink) {
    throw new Error(
      `The container ${containerPath} is not a symbolic link.`,
    );
  }

  if (subDirectory) {
    const joinedPath = securePath(containerPath)(subDirectory!);
    Deno.mkdirSync(joinedPath, { recursive: true });
    return joinedPath;
  } else {
    return containerPath;
  }
}

export function ensureSymlinkedDataDirectory(subDirectory?: string) {
  return ensureSymlinkedDirectory(resolveMainModule("./.data"), subDirectory);
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
  } catch {
    return false;
  }
}

export function isDirectorySync(path: string): boolean {
  try {
    const fileInfo = Deno.lstatSync(path);
    return fileInfo.isDirectory;
  } catch {
    return false;
  }
}

export function isFileSync(path: string): boolean {
  try {
    const fileInfo = Deno.statSync(path);
    return fileInfo.isFile;
  } catch {
    return false;
  }
}
