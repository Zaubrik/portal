import { getPathnameFs, runWithPipes } from "./mod.ts";

export async function pull(path: string | URL) {
  return await runWithPipes(
    `git -C ${getPathnameFs(path)} pull`,
  );
}

export async function clone(
  path: string | URL,
  repoUrl: string | URL,
  cloneName?: string,
) {
  return await runWithPipes(
    cloneName
      ? `git -C ${getPathnameFs(path)} clone ${repoUrl} ${cloneName}`
      : `git -C ${getPathnameFs(path)} clone ${repoUrl}`,
  );
}
