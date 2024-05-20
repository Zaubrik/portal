import {
  basename,
  dirname,
  extname,
  join,
  normalize,
  resolve,
} from "./deps.ts";
import {
  getPathnameFs,
  hasExtension,
  resolveMainModule,
  securePath,
} from "./path.ts";

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

export async function getDirectories(directory: string) {
  return (await getDirEntries(directory)).filter((
    entry,
  ) => entry.isDirectory).map((entry) => entry.name);
}

export async function getFiles(directory: string) {
  return (await getDirEntries(directory)).filter((
    entry,
  ) => entry.isFile).map((entry) => entry.name);
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

export function readTextFilesByExtension(extension: string) {
  if (!extension.startsWith(".")) {
    throw new Error("The extension must start with a dot.");
  }
  return async (pathOrUrl: string | URL) => {
    return await Promise.all(
      (await getRecursiveFilepaths(pathOrUrl))
        .filter(hasExtension(extension))
        .map(async (filePath) => [await Deno.readTextFile(filePath), filePath]),
    );
  };
}

export async function exists(path: string): Promise<boolean> {
  try {
    await Deno.lstat(path);
    return true;
  } catch {
    return false;
  }
}

export function existsSync(path: string): boolean {
  try {
    Deno.lstatSync(path);
    return true;
  } catch {
    return false;
  }
}

export async function isDirectory(path: string): Promise<boolean> {
  try {
    const fileInfo = await Deno.lstat(path);
    return fileInfo.isDirectory;
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

export async function isFile(path: string): Promise<boolean> {
  try {
    const fileInfo = await Deno.stat(path);
    return fileInfo.isFile;
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

export async function isSymlink(path: string): Promise<boolean> {
  try {
    const fileInfo = await Deno.lstat(path);
    return fileInfo.isSymlink;
  } catch {
    return false;
  }
}

export function isSymlinkSync(path: string): boolean {
  try {
    const fileInfo = Deno.lstatSync(path);
    return fileInfo.isSymlink;
  } catch {
    return false;
  }
}

export async function isEmptyDirectory(path: string): Promise<boolean> {
  try {
    for await (const _ of Deno.readDir(path)) {
      return false;
    }
    return true;
    // Handle error (e.g., directory not found, permission denied)
  } catch {
    // Return false or throw, depending on your error handling strategy
    return false;
  }
}

export function ensureSymlinkedDirectorySync(
  directoryFrom: URL | string,
  directoryTo: URL | string,
  { subDirectory }: { subDirectory?: string } = {},
): string {
  const directoryPathFrom = normalize(getPathnameFs(directoryFrom));
  const directoryPathTo = normalize(getPathnameFs(directoryTo));
  if (extname(directoryPathFrom) || extname(directoryPathTo)) {
    throw new Error("The directories must have no file extension.");
  }
  const directoryPathToDirname = dirname(directoryPathTo);
  Deno.mkdirSync(directoryPathToDirname, { recursive: true });
  let directoryIsSymlink = false;
  try {
    directoryIsSymlink = Deno.lstatSync(directoryPathTo).isSymlink;
  } catch {
    try {
      const directoryFromFileInfo = Deno.lstatSync(directoryPathFrom);
      if (!directoryFromFileInfo.isDirectory) {
        throw new Error(
          `The directory ${directoryPathFrom} has the wrong file type.`,
        );
      }
      Deno.symlinkSync(directoryPathFrom, directoryPathTo);
      directoryIsSymlink = Deno.lstatSync(directoryPathTo).isSymlink;
      console.log(
        `Creating a symlink from ${directoryPathFrom} to ${directoryPathTo}.`,
      );
    } catch {
      // It needs the `--unstable` flag at the moment:
      // Deno.umask(0);
      Deno.mkdirSync(directoryPathFrom, { recursive: true });
      Deno.symlinkSync(directoryPathFrom, directoryPathTo);
      directoryIsSymlink = Deno.lstatSync(directoryPathTo).isSymlink;
      console.log(
        `Creating a symlink from ${directoryPathFrom} to ${directoryPathTo}.`,
      );
    }
  }
  if (!directoryIsSymlink) {
    throw new Error(
      `The directory ${directoryPathTo} is not a symbolic link.`,
    );
  }

  if (subDirectory) {
    const joinedPath = securePath(directoryPathTo)(subDirectory!);
    Deno.mkdirSync(joinedPath, { recursive: true });
    return joinedPath;
  } else {
    return directoryPathTo;
  }
}

export function ensureSymlinkedParentDirectorySync(
  directory: URL | string,
  subDirectory?: string,
): string {
  // Normalize to ensure consistent path separators and remove trailing slashes
  const directoryTo = normalize(getPathnameFs(directory));
  const directoryFrom = join(
    dirname(dirname(directoryTo)),
    basename(directoryTo),
  );
  return ensureSymlinkedDirectorySync(directoryFrom, directoryTo, {
    subDirectory,
  });
}

export function ensureSymlinkedDataDirectorySync(subDirectory?: string) {
  return ensureSymlinkedParentDirectorySync(
    resolveMainModule("./.data"),
    subDirectory,
  );
}
