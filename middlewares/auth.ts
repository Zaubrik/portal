import { Context } from "../portal.ts";
import {
  base64,
  createHttpError,
  mergeUrl,
  Payload,
  Status,
  STATUS_TEXT,
  verify,
} from "./deps.ts";

export type AuthState = { payload: Payload };

/**
 * Returns a `Handler` which verifys a JWT sent with the `Authorization` header.
 * If the JWT is invalid or not present a `Response` object with the status `401`
 * is thrown. Otherwise the JWT's `payload` is assigned to the `state` property.
 */
export function verifyJwt(key: CryptoKey | string) {
  return async (ctx: Context<AuthState>): Promise<Response> => {
    try {
      const authHeader = ctx.request.headers.get("Authorization");
      if (
        !authHeader ||
        !authHeader.startsWith("Bearer ") ||
        authHeader.length <= 7
      ) {
        throw new Error("No or invalid 'Authorization' header.");
      } else {
        const cryptoKey = key instanceof CryptoKey ? key : await importKey(key);
        const payload = await verify(authHeader.slice(7), cryptoKey);
        ctx.state.payload = payload;
      }
      return ctx.response;
    } catch {
      throw new Response(STATUS_TEXT[Status.Unauthorized], {
        status: Status.Unauthorized,
        headers: new Headers({ "WWW-Authenticate": "Bearer" }),
      });
    }
  };
}

async function importKey(pathOrUrl: string | URL): Promise<CryptoKey> {
  try {
    const readKey = await Deno.readTextFile(pathOrUrl);
    const binaryDer = base64.decode(readKey).buffer;

    const key = await crypto.subtle.importKey(
      "raw",
      binaryDer,
      {
        name: "HMAC",
        hash: "SHA-512",
      },
      true,
      ["sign", "verify"],
    );

    return key;
  } catch (err) {
    if (err instanceof Deno.errors.NotFound) {
      throw new Error("Key file not found");
    }
    throw new Error("Failed to import key");
  }
}
