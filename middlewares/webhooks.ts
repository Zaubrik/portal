import { Context } from "../portal.ts";
import {
  createHttpError,
  ensureFile,
  equals,
  getFilename,
  getPathname,
  isError,
  isResponse,
  runWithPipes,
  Status,
  verifyHmacSha,
} from "./deps.ts";

export type WebhooksState = { webhookPayload: Record<string, any> };

export function verifyGhWebhook(ghWebhooksSecret: string) {
  return async (ctx: Context<WebhooksState>): Promise<void> => {
    const payload = await ctx.request.json();
    const xHubSignature256OrNull = ctx.request.headers.get(
      "X-Hub-Signature-256",
    );
    if (
      xHubSignature256OrNull && await verifyHmacSha(
        xHubSignature256OrNull,
        "HS256",
        ghWebhooksSecret,
        JSON.stringify(payload),
      )
    ) {
      console.log("webhook is verified!");
      ctx.state.webhookPayload = payload;
    } else {
      throw createHttpError(Status.Unauthorized);
    }
  };
}

function removeTrailingSlash(path: string) {
  return path[-1] === "/" ? path.slice(0, -1) : path;
}

export function pullRepository(
  gitDirectories: (string | URL)[],
  ghBaseUrlWithToken?: string,
) {
  const directoryPaths = gitDirectories
    .map(getPathname)
    .map(removeTrailingSlash);
  return async (ctx: Context<WebhooksState>) => {
    try {
      if (ctx.state.webhookPayload) {
        const { repository, hook } = ctx.state.webhookPayload;
        if (hook) throw new Response();
        if (repository) {
          const repoNamesAreEqual = (dir: string) =>
            equals(repository.name)(getFilename(dir));
          if (directoryPaths.some(repoNamesAreEqual)) {
            const gitDirectory = directoryPaths.find(repoNamesAreEqual);
            const pullResult = await runWithPipes(
              `git -C ${gitDirectory} pull ${ghBaseUrlWithToken}/${repository.name}`,
            );
            throw new Response();
          } else {
            throw new Error("No matching repository name.");
          }
        } else {
          throw new Error("No property 'repository' in webhook payload.");
        }
      } else {
        throw new Error("No webhook payload.");
      }
    } catch (errorOrResponse) {
      throw isResponse(errorOrResponse) ? errorOrResponse : createHttpError(
        Status.InternalServerError,
        isError(errorOrResponse) ? errorOrResponse.message : undefined,
      );
    }
  };
}

export function writeWebhook(url: string | URL) {
  return async (ctx: Context<WebhooksState>) => {
    await ensureFile(getPathname(url));
    await Deno.writeTextFile(
      url,
      `${JSON.stringify(ctx.state.webhookPayload)},`,
      { append: true },
    );
  };
}
