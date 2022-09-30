import {
  Context,
  createHttpError,
  isObject,
  isString,
  semver,
  Status,
} from "../deps.ts";
import { JsonObject, verifyHmacSha } from "../util/mod.ts";

export type WebhookPayload = JsonObject;
export type WebhooksState = { webhookPayload: WebhookPayload };
export type CreateEventPayload = {
  repository: JsonObject;
  ref_type: "tag" | "branch";
  ref: string;
};

// https://docs.github.com/en/developers/webhooks-and-events/webhooks/securing-your-webhooks

/**
 * A curried middleware which takes a github webhook secret and assigns the
 * webhook's payload to the `state` if the webhook can be verified. Otherwise it
 * throws an error.
 */
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

/**
 * Takes the webhook's payload and validates it for the `create` event and
 * returns `CreateEventPayload`.
 */
export function validatePayloadForCreateEvent(
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
