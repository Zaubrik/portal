import { type Context, createHttpError, Status } from "./deps.ts";
import { type HsAlgorithm } from "../functions/crypto/crypto_key.ts";
import { type JsonObject } from "../functions/json.ts";
import { defaultSuffix, verifyWebhook } from "../functions/webhook.ts";

export type WebhooksState = { webhookPayload: JsonObject };

/**
 * A curried middleware which takes a secret, algorithm and a header name. It
 * assigns the webhook's payload to the `state` if the webhook can be verified.
 * Otherwise it throws an error. The body's message must be JSON object and the
 * header needs a suffix with the length of `7` like `sha256=`.
 */
export function addWebhookPayloadToState(
  secret: string,
  algorithm: HsAlgorithm,
  signatureHeader: string,
  { suffixLength = defaultSuffix.length }: { suffixLength?: number } = {},
) {
  return async <C extends Context<WebhooksState>>(ctx: C): Promise<C> => {
    try {
      ctx.state.webhookPayload = await verifyWebhook(ctx.request, {
        secret,
        algorithm,
        signatureHeader,
        suffixLength,
      });
      return ctx;
    } catch {
      throw createHttpError(
        Status.BadRequest,
        "The webhook request could not be verified.",
      );
    }
  };
}
