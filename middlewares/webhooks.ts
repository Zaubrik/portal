import { Context } from "../portal.ts";
import {
  createHttpError,
  ensureFile,
  equals,
  getFilename,
  getPathname,
  isError,
  isObjectWide,
  runWithPipes,
  Status,
  verifyHmacSha,
} from "./deps.ts";

export type WebhooksState = { webhookPayload: Record<string, any> };

export function verifyGhWebhook(ghWebhooksSecret: string) {
  return async (ctx: Context<WebhooksState>): Promise<void> => {
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
          if (isVerified) {
            if (isObjectWide(payload)) {
              ctx.state.webhookPayload = payload;
              return undefined;
            }
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

function getDirectoryPaths(directories: (string | URL)[]) {
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

export function cloneRepositoryWithTagName(
  directories: (string | URL)[],
  ghBaseUrlWithToken?: string,
) {
  const directoryPaths = getDirectoryPaths(directories);
  return async (ctx: Context<WebhooksState>): Promise<Response> => {
    try {
      // https://docs.github.com/en/developers/webhooks-and-events/webhooks/webhook-events-and-payloads
      const { repository, hook, ref, ref_type } = ctx.state.webhookPayload;
      if (isObjectWide(repository) && !hook && ref_type === "tag" && ref) {
        const name = repository.name;
        const directory = directoryPaths.find(repoNamesAreEqual(name));
        if (directory) {
          const cloneResult = await runWithPipes(
            `git -C ${directory} clone ${ghBaseUrlWithToken}/${name} ${name}@${ref}`,
          );
          await Deno.writeTextFile(
            `${directory}/${name}/tags.txt`,
            await (createTagsList(directory)),
          );
        }
      }
      return new Response();
    } catch (caught) {
      throw createHttpError(Status.InternalServerError, caught.message);
    }
  };
}

export function pullRepository(
  directories: (string | URL)[],
  ghBaseUrlWithToken?: string,
) {
  const directoryPaths = getDirectoryPaths(directories);
  return async (ctx: Context<WebhooksState>): Promise<Response> => {
    try {
      const { repository, hook } = ctx.state.webhookPayload;
      if (isObjectWide(repository) && !hook) {
        const name = repository.name;
        const directory = directoryPaths.find(repoNamesAreEqual(name));
        if (directory) {
          const pullResult = await runWithPipes(
            `git -C ${directory}/${name} pull ${ghBaseUrlWithToken}/${name}`,
          );
        }
      }
      return new Response();
    } catch (caught) {
      throw createHttpError(Status.InternalServerError, caught.message);
    }
  };
}

export function writeWebhook(url: string | URL) {
  return async (ctx: Context<WebhooksState>): Promise<void> => {
    try {
      await ensureFile(getPathname(url));
      await Deno.writeTextFile(
        url,
        `${JSON.stringify(ctx.state.webhookPayload)},`,
        { append: true },
      );
    } catch (caught) {
      throw createHttpError(Status.InternalServerError, caught.message);
    }
  };
}
