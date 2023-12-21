import { isObject } from "./deps.ts";
import { verifyHmacSha } from "./crypto/hmac.ts";
import { type HsAlgorithm } from "./crypto/crypto_key.ts";
import { type JsonObject } from "./json.ts";

// https://docs.github.com/en/developers/webhooks-and-events/webhooks/securing-your-webhooks
export const defaultSuffix = "shaXXX=";

export async function verifyWebhook(
  request: Request,
  { secret, algorithm, signatureHeader, suffixLength = defaultSuffix.length }: {
    secret: string;
    algorithm: HsAlgorithm;
    signatureHeader: string;
    suffixLength?: number;
  },
): Promise<JsonObject> {
  const signatureHeaderOrNull = request.headers.get(signatureHeader);
  if (signatureHeaderOrNull) {
    const signature = signatureHeaderOrNull.slice(suffixLength ?? 0);
    if (signature) {
      const payload = await request.json();
      const isVerified = await verifyHmacSha(
        signature,
        algorithm,
        secret,
        JSON.stringify(payload),
      );
      if (isVerified && isObject(payload)) {
        return payload as JsonObject;
      }
    }
  }
  throw new Error("The webhook request could not be verified.");
}
