import {
  Context,
  createHttpError,
  equals,
  getDirname,
  getFilename,
  isHttpError,
  isObject,
  isPresent,
  isString,
  semver,
  Status,
} from "../deps.ts";
import {
  getPathnameFs,
  JsonObject,
  runWithPipes,
  verifyHmacSha,
} from "../util/mod.ts";

export type WebhookPayload = JsonObject;
type CreateEventPayload = {
  repository: JsonObject;
  ref_type: "tag" | "branch";
  ref: string;
};
export type WebhooksState = { webhookPayload: WebhookPayload };

// https://docs.github.com/en/developers/webhooks-and-events/webhooks/securing-your-webhooks
export function verifyGhWebhook(ghWebhooksSecret: string) {
  return async <C extends Context<WebhooksState>>(ctx: C): Promise<C> => {
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
          if (isVerified && isObject(payload)) {
            ctx.state.webhookPayload = payload as JsonObject;
            return ctx;
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

export function requestRepoUpdate(urls: (string | URL)[]) {
  return async <C extends Context<WebhooksState>>(ctx: C): Promise<C> => {
    try {
      const responses = await Promise.all(
        urls
          .map(createRequestInput(ctx.state.webhookPayload))
          .flat()
          .filter(isPresent)
          .map(async (url: URL) => await fetch(url, { method: "POST" })),
      );
      ctx.response = new Response();
      return ctx;
    } catch (err) {
      throw isHttpError(err)
        ? err
        : createHttpError(Status.InternalServerError, err.message);
    }
  };
}

function createRequestInput(webhookPayload: WebhookPayload) {
  return (url: string | URL): [URL, URL | null] | null => {
    // https://docs.github.com/en/developers/webhooks-and-events/webhooks/webhook-events-and-payloads#ping
    if (webhookPayload.zen) return null;
    const { repository, ref, ref_type } = validatePayloadForCreateEvent(
      webhookPayload,
    );
    const { name, full_name } = repository;
    const isZaubrik = full_name === `Zaubrik/${name}`;
    const fullUrl = `${url}/${isZaubrik ? "github" : "land"}`;
    return [
      new URL(`${fullUrl}/${name}`),
      ref_type === "tag" ? new URL(`${fullUrl}/${name}@${ref}`) : null,
    ];
  };
}

function validatePayloadForCreateEvent(
  webhookPayload: WebhookPayload,
): CreateEventPayload {
  const { repository, ref, ref_type } = webhookPayload;
  if (isObject(repository) && isString(repository.name)) {
    if (ref_type === "tag") {
      if (isString(ref) && semver.valid(ref)) {
        return { repository, ref, ref_type };
      } else {
        throw createHttpError(Status.BadRequest, "Invalid webhook tag.");
      }
    } else if (ref_type === "branch") {
      if (ref === "main") {
        return { repository, ref, ref_type };
      } else {
        throw createHttpError(Status.BadRequest, "Invalid webhook branch.");
      }
    } else {
      throw createHttpError(Status.BadRequest, "Invalid webhook event.");
    }
  } else {
    throw createHttpError(Status.BadRequest, "Invalid repository name.");
  }
}

/**
 * Create directory `clones` outside and make a symbolic link into the root directory.
 */
export function prepareDirectory(
  directories: (string | URL)[],
  ghBaseUrlWithToken: string,
) {
  const directoryPaths = directories
    .map(getPathnameFs)
    .map(removeTrailingSlash)
    .map((repoPath: string) => {
      const parentDir = getDirname(repoPath);
      try {
        const isDirectory = Deno.statSync(repoPath);
      } catch (_error) {
        Deno.mkdirSync(parentDir, { recursive: true });
        const name = getFilename(repoPath);
        runWithPipes(
          `git -C ${parentDir} clone ${ghBaseUrlWithToken}/${name} ${name}`,
        );
      }
      return repoPath;
    });
  return directoryPaths;
}

function removeTrailingSlash(path: string) {
  return path[-1] === "/" ? path.slice(0, -1) : path;
}

function repoNamesAreEqual(name: unknown) {
  return (dir: string) => equals(name)(getFilename(dir));
}

function getPathnameParams(
  ctx: Context,
): { repo: string; directory: string; tag: string } {
  const { repo, directory, tag } = ctx.params.pathname.groups;
  if (!repo || !directory) {
    throw new Error("No valid pathname params.");
  }
  return { repo, directory, tag: tag || "" };
}

export function updateRepo(container: string, ghBaseUrlWithToken: string) {
  return async <C extends Context>(ctx: C): Promise<C> => {
    try {
      const { directory, repo, tag } = getPathnameParams(ctx);
      const filename = `${repo}${tag ? `@${tag}` : ""}`;
      try {
        await runWithPipes(
          `git -C ${container}/${directory}/${filename} pull`,
        );
      } catch {
        await runWithPipes(
          `git -C ${container}/${directory} clone ${ghBaseUrlWithToken}/${repo} ${filename}`,
        );
      }
      ctx.response = new Response();
      return ctx;
    } catch (caught) {
      throw createHttpError(Status.BadRequest, caught.message, {
        expose: false,
      });
    }
  };
}

async function createTagsList(dirPath: string | URL, repo: string) {
  const directory = getPathnameFs(dirPath);
  const names: string[] = [];
  for await (const dirEntry of Deno.readDir(directory)) {
    if (
      dirEntry.isDirectory &&
      (dirEntry.name === repo || dirEntry.name.startsWith(`${repo}@`))
    ) {
      names.push(dirEntry.name);
    }
  }
  return names.sort().map((name) => ({ data: name }));
}

function getTag(name: string) {
  const lastIndex = name.lastIndexOf("@");
  return lastIndex === -1 ? name : name.slice(lastIndex + 1);
}

function createSectionData(tag: string) {
  return { data: tag };
}

export function serveIndex(container: string, getIndexFile: any) {
  return async <C extends Context>(ctx: C): Promise<C> => {
    const tagData = await createTagsList(
      `${container}/github`,
      ctx.params.pathname.groups.repo,
    );
    ctx.response = new Response(
      await getIndexFile({ pathname: ctx.url.pathname, tagData }),
      {
        headers: new Headers({ "Content-Type": "text/html" }),
      },
    );
    return ctx;
  };
}
