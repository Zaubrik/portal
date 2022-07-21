import {
  base64,
  Context,
  createHttpError,
  Payload,
  Status,
  verify,
} from "../deps.ts";

export type AuthState = { payload: Payload };

/**
 * Takes a key or path and returns a `Handler` which verifys a JWT sent with the
 * `Authorization` header.  If the JWT is invalid or not present an `HttpError`
 * with the status `401` is thrown. Otherwise the JWT's `payload` is assigned to
 * the `state` property.
 */
export function verifyJwt(keyOrPath: CryptoKey | string | URL) {
  return async <C extends Context<AuthState>>(ctx: C): Promise<C> => {
    try {
      const authHeader = ctx.request.headers.get("Authorization");
      if (
        !authHeader ||
        !authHeader.startsWith("Bearer ") ||
        authHeader.length <= 7
      ) {
        throw new Error("No or invalid 'Authorization' header.");
      } else {
        const cryptoKey = keyOrPath instanceof CryptoKey
          ? keyOrPath
          : await importKey(keyOrPath);
        const payload = await verify(authHeader.slice(7), cryptoKey);
        ctx.state.payload = payload;
      }
      return ctx;
    } catch (error) {
      throw createHttpError(Status.Unauthorized, error.message, {
        expose: false,
      }); // ADD! headers: new Headers({ "WWW-Authenticate": "Bearer" })
    }
  };
}

async function importKey(path: string | URL): Promise<CryptoKey> {
  try {
    const readKey = await Deno.readTextFile(path);
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
      throw new Error("The key file was not found.");
    }
    throw new Error("Failed to import the key.");
  }
}
