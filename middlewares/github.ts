import { Context } from "../portal.ts";
import {
  createHttpError,
  ensureFile,
  equals,
  getFilename,
  getPathname,
  isError,
  isObjectWide,
  isPresent,
  runWithPipes,
  Status,
  verifyHmacSha,
} from "./deps.ts";

export type WebhookPayload = Record<string, unknown>;
export type WebhooksState = { webhookPayload: WebhookPayload };
type Directories = (string | URL)[];
type PathnameParams = { action: Actions; name: string; ref: string };
type Actions = typeof actions[keyof typeof actions];

const actions = {
  tagclone: "tagclone",
  pull: "pull",
} as const;

export function verifyGhWebhook(ghWebhooksSecret: string) {
  return async (ctx: Context<WebhooksState>): Promise<Response> => {
    try {
      const xHubSignature256OrNull = ctx.request.headers.get(
        "X-Hub-Signature-256",
      );
      if (xHubSignature256OrNull) {
        const xHubSignature256 = xHubSignature256OrNull.slice(7);
        if (xHubSignature256) {
          const payload = await ctx.request.json();
          const isVerified = await verifyHmacSha(
            xHubSignature256,
            "HS256",
            ghWebhooksSecret,
            JSON.stringify(payload),
          );
          if (isVerified && isObjectWide(payload)) {
            ctx.state.webhookPayload = payload;
            return ctx.response;
          }
        }
      }
      throw new Error();
    } catch {
      throw createHttpError(
        Status.BadRequest,
        "The webhook request could not be verified.",
      );
    }
  };
}

type RequestActionsInput = {
  name: string;
  action: Actions;
  host: string;
};

function createRequestInput(webhookPayload: WebhookPayload) {
  return ({ name, action, host }: RequestActionsInput): URL | null => {
    const { repository, hook, ref, ref_type } = webhookPayload;
    if (isObjectWide(repository) && !hook && ref_type === "tag" && ref) {
      if (equals(name)(repository.name)) {
        return new URL(`${host}/github/${action}/${name}/${ref}`);
      }
    }
    return null;
  };
}

async function requestActions(input: RequestActionsInput[]) {
  return async (ctx: Context<WebhooksState>): Promise<Response> => {
    const responses = await Promise.all(
      input
        .map(createRequestInput(ctx.state.webhookPayload))
        .filter(isPresent)
        .map((url: URL) => fetch(url)),
    );
    return ctx.response;
  };
}

function getDirectoryPaths(directories: Directories) {
  const directoryPaths = directories
    .map(getPathname)
    .map(removeTrailingSlash);
  const hasMatchingSubdirs = directoryPaths.every((dir) => {
    const subDirectory = `${dir}/${getFilename(dir)}`;
    return Deno.statSync(subDirectory).isDirectory;
  });
  if (!hasMatchingSubdirs) {
    throw new Error(
      "The directory tree for the GitHub repositories is incorrect.",
    );
  }
  return directoryPaths;
}

function removeTrailingSlash(path: string) {
  return path[-1] === "/" ? path.slice(0, -1) : path;
}

function repoNamesAreEqual(name: unknown) {
  return (dir: string) => equals(name)(getFilename(dir));
}

function getTag(name: string) {
  const lastIndex = name.lastIndexOf("@");
  return lastIndex === -1 ? name : name.slice(lastIndex + 1);
}

async function createTagsList(dirPath: string | URL) {
  const directory = getPathname(dirPath);
  const names: string[] = [];
  for await (const dirEntry of Deno.readDir(directory)) {
    if (dirEntry.isDirectory && dirEntry.name.includes("@")) {
      names.push(dirEntry.name);
    }
  }

  return names.sort().map(getTag).join("\n");
}

function getPathnameParams(ctx: Context): PathnameParams {
  const { action, name, ref } = ctx.params.pathname.groups as any;
  if (!action || !name || !ref) {
    throw new Error("No valid pathname params.");
  }
  return { action, name, ref };
}

export async function run(
  { action, name, ref, directory, ghBaseUrlWithToken }: PathnameParams & {
    directory: Directories[number];
    ghBaseUrlWithToken: string;
  },
) {
  switch (action) {
    case "pull":
      return await runWithPipes(
        `git -C ${directory}/${name} pull ${ghBaseUrlWithToken}/${name}`,
      );
      break;
    case "tagclone":
      return await runWithPipes(
        `git -C ${directory} clone ${ghBaseUrlWithToken}/${name} ${name}@${ref}`,
      );
      break;
    default:
      throw new Error("Invalid action.");
  }
}

export function pullRepository(
  directories: Directories,
  ghBaseUrlWithToken: string,
) {
  const directoryPaths = getDirectoryPaths(directories);
  return async (ctx: Context<WebhooksState>): Promise<Response> => {
    try {
      const { action, name, ref } = getPathnameParams(ctx);
      const directory = directoryPaths.find(repoNamesAreEqual(name));
      if (directory) {
        const result = await run({
          action,
          name,
          ref,
          directory,
          ghBaseUrlWithToken,
        });
      }
      return new Response();
    } catch (caught) {
      throw createHttpError(Status.InternalServerError, caught.message);
    }
  };
}
