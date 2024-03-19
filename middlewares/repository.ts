import {
  type Context,
  createHttpError,
  isObject,
  isString,
  semver,
  Status,
} from "./deps.ts";
import { type JsonObject } from "../functions/json.ts";
import { isDirectorySync, isSymlinkSync } from "../functions/fs.ts";
import { getDirectoriesFromRepo, pullOrClone } from "../functions/git.ts";
import { type WebhooksState } from "./webhook.ts";

export type PayloadForCreateEvent = {
  repository: {
    name: string;
    owner: Record<string, JsonObject> & { login: string };
  };
  ref_type: "tag" | "branch";
  ref: string;
};

/**
 * Takes the webhook's payload and validates it for the `create` event and
 * returns a `CreateEventPayload`.
 */
export function validatePayloadForCreateEvent(
  // deno-lint-ignore no-explicit-any
  webhookPayload: any,
): PayloadForCreateEvent {
  const { repository, ref, ref_type } = webhookPayload;
  if (
    isObject(repository) && isString(repository.name) &&
    isObject(repository.owner) && isString(repository.owner.login)
  ) {
    if (ref_type === "tag") {
      if (isString(ref) && semver.parse(ref)) {
        return {
          repository,
          ref,
          ref_type,
        } as unknown as PayloadForCreateEvent;
      } else {
        throw new Error("Invalid webhook tag.");
      }
    } else if (ref_type === "branch") {
      if (ref === "main") {
        return { repository, ref, ref_type } as PayloadForCreateEvent;
      } else {
        throw new Error("Invalid webhook branch.");
      }
    } else {
      throw new Error("Invalid webhook event.");
    }
  } else {
    throw new Error("Invalid webhook payload.");
  }
}

/**
 * It takes a `container` and a `repoOwner`, e.g. `Zaubrik` and the 'repositories'.
 * Create a `container` directory outside of the root directory and create a
 * symbolic link in the root directory.
 */
export function pullOrCloneRepo(
  containerPath: string,
  repoOwner: string | string[],
  { repositories, token }: { repositories?: string[]; token?: string } = {},
) {
  if (!isDirectorySync(containerPath) && !isSymlinkSync(containerPath)) {
    throw new Error(`The path ${containerPath} is not a directory.`);
  }
  return async <C extends Context<WebhooksState>>(ctx: C): Promise<C> => {
    try {
      const webhookPayload = ctx.state.webhookPayload;
      if (!webhookPayload.zen) {
        const { repository, ref, ref_type } = validatePayloadForCreateEvent(
          webhookPayload,
        );
        const { owner } = repository;
        if (![repoOwner].flat().includes(owner?.login)) {
          throw new Error("The repository has the wrong owner.");
        }
        if (repositories && !repositories.includes(repository.name)) {
          throw new Error("The repository is not in the list of repositories.");
        }
        await pullOrClone(containerPath, { repository, ref: "", token });
        if (ref_type === "tag" && ref) {
          await pullOrClone(containerPath, { repository, ref, token });
        }
      }
      ctx.response = new Response();
      return ctx;
    } catch (error) {
      throw createHttpError(Status.BadRequest, error.message, {
        expose: false,
      });
    }
  };
}

export function createTagList(containerPath: string) {
  return async <C extends Context<WebhooksState>>(ctx: C): Promise<C> => {
    if (!ctx.result.pathname.groups.repo) {
      throw createHttpError(
        Status.InternalServerError,
        "Wrong parameter for the URLPattern group.",
      );
    }
    const tags = await getDirectoriesFromRepo(
      containerPath,
      ctx.result.pathname.groups.repo,
    );
    ctx.response = Response.json(JSON.stringify(tags));
    return ctx;
  };
}

// https://stackoverflow.com/a/69008070/12222244
export function setTypeScriptMimeType<C extends Context>(ctx: C): C {
  if (
    ctx.response.headers.get("content-type")?.toLowerCase() === "video/mp2t"
  ) {
    ctx.response.headers.set("content-type", "text/typescript; charset=utf-8");
  }
  return ctx;
}

export function throwNotFoundError<C extends Context>(_ctx: C): never {
  throw createHttpError(Status.NotFound);
}

export function serveIndex(
  containerPath: string,
  getIndexFile: (
    { pathname, tagData }: { pathname: string; tagData: string[] },
  ) => Promise<string>,
) {
  return async <C extends Context>(ctx: C): Promise<C> => {
    if (!ctx.result.pathname.groups.repo) {
      throw createHttpError(
        Status.InternalServerError,
        "Wrong parameter for the URLPattern group.",
      );
    }
    const tagData = await getDirectoriesFromRepo(
      containerPath,
      ctx.result.pathname.groups.repo,
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
