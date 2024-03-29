import { isString, join } from "./deps.ts";
import { getPathnameFs } from "./path.ts";
import { spawnSubprocess } from "./subprocess.ts";
import { type JsonObject } from "./json.ts";

export async function push(path: string | URL, option?: string) {
  return await spawnSubprocess("git", {
    args: option
      ? ["-C", getPathnameFs(path), "push", option]
      : ["-C", getPathnameFs(path), "push"],
  });
}

export async function add(path: string | URL) {
  return await spawnSubprocess("git", {
    args: ["-C", getPathnameFs(path), "add", "."],
  });
}

export async function commit(path: string | URL, message = "-") {
  try {
    return await spawnSubprocess("git", {
      args: ["-C", getPathnameFs(path), "commit", "-m", message],
    });
  } catch (error) {
    const substring = "nothing to commit, working tree clean";
    if (!error.message.includes(substring)) {
      throw error;
    } else {
      console.log(error.message);
      return error.message;
    }
  }
}

export async function pull(path: string | URL, repoUrl?: string | URL) {
  return await spawnSubprocess("git", {
    args: repoUrl
      ? [
        "-C",
        getPathnameFs(path),
        "pull",
        isString(repoUrl) ? repoUrl : repoUrl.href,
      ]
      : ["-C", getPathnameFs(path), "pull"],
  });
}

export async function clone(
  path: string | URL,
  repoUrl: string | URL,
  cloneName?: string,
) {
  const url = isString(repoUrl) ? repoUrl : repoUrl.href;
  const pathname = getPathnameFs(path);
  return await spawnSubprocess(
    "git",
    {
      args: cloneName
        ? ["-C", pathname, "clone", url, cloneName]
        : ["-C", pathname, "clone", url],
    },
  );
}

export async function pullOrClone(
  parentDirectory: string,
  { repository, ref, token }: {
    repository: {
      name: string;
      owner: Record<string, JsonObject> & { login: string };
    };
    ref: string;
    token?: string;
  },
) {
  const { name, owner } = repository;
  const destination = `${name}${ref ? `@${ref}` : ""}`;
  const repoPath = join(parentDirectory, destination);
  const url = `https://${
    token ? `${token}@` : ""
  }github.com/${owner.login}/${name}`;
  try {
    try {
      await pull(repoPath, url);
    } catch {
      await clone(parentDirectory, url, destination);
    }
  } catch {
    await spawnSubprocess(
      "rm",
      {
        args: ["-rf", repoPath],
      },
    );
    await clone(
      parentDirectory,
      `https://${token ? `${token}@` : ""}github.com/${owner.login}/${name}`,
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
