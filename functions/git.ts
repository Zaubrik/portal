import { join } from "./deps.ts";
import { getPathnameFs } from "./path.ts";
import { spawnSubprocess } from "./subprocess.ts";
import { type JsonObject } from "./json.ts";

export async function pull(path: string | URL) {
  return await spawnSubprocess("git", {
    args: ["-C", getPathnameFs(path), "pull"],
  });
}

export async function clone(
  path: string | URL,
  repoUrl: string | URL,
  cloneName?: string,
) {
  const repo = repoUrl instanceof URL ? repoUrl.href : repoUrl;
  const pathname = getPathnameFs(path);
  return await spawnSubprocess(
    "git",
    {
      args: cloneName
        ? ["-C", pathname, "clone", repo, cloneName]
        : ["-C", pathname, "clone", repo],
    },
  );
}

export async function pullOrClone(
  parentDirectory: string,
  { repository, ref }: {
    repository: {
      name: string;
      owner: Record<string, JsonObject> & { login: string };
    };
    ref: string;
  },
) {
  const { name, owner } = repository;
  const destination = `${name}${ref ? `@${ref}` : ""}`;
  try {
    await pull(join(parentDirectory, destination));
  } catch {
    await clone(
      parentDirectory,
      `https://github.com/${owner.login}/${name}`,
      destination,
    );
  }
}

export async function getDirectoriesFromRepo(
  containerPath: string,
  repo: string,
): Promise<string[]> {
  const names: string[] = [];
  for await (const dirEntry of Deno.readDir(containerPath)) {
    if (
      dirEntry.isDirectory &&
      (dirEntry.name === repo || dirEntry.name.startsWith(`${repo}@`))
    ) {
      names.push(dirEntry.name);
    }
  }
  return names.sort();
}
