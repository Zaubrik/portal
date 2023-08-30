import { type Context, createHttpError, isObject, Status } from "./deps.ts";
import { type JsonObject } from "../functions/json.ts";
import { verifyHmacSha } from "../functions/crypto/hmac.ts";

export type WebhooksState = { webhookPayload: JsonObject };
type HsAlgorithm = Parameters<typeof verifyHmacSha>[1];

// https://docs.github.com/en/developers/webhooks-and-events/webhooks/securing-your-webhooks
const suffix = "shaXXX=";

/**
 * A curried middleware which takes a secret, algorithm and a header name. It
 * assigns the webhook's payload to the `state` if the webhook can be verified.
 * Otherwise it throws an error. The body's message must be JSON object and the
 * header needs a suffix with the length of `7` like `sha256=`.
 */
export function verifyWebhook(
  webhooksSecret: string,
  algorithm: HsAlgorithm,
  signatureHeader: string,
) {
  return async <C extends Context<WebhooksState>>(ctx: C): Promise<C> => {
    try {
      const signatureHeaderOrNull = ctx.request.headers.get(signatureHeader);
      if (signatureHeaderOrNull) {
        const signature = signatureHeaderOrNull.slice(suffix.length);
        if (signature) {
          const payload = await ctx.request.json();
          const isVerified = await verifyHmacSha(
            signature,
            algorithm,
            webhooksSecret,
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
