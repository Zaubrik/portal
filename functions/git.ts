import { getPathnameFs } from "./path.ts";
import { spawnSubprocess } from "./subprocess.ts";

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
