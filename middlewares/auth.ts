import { Context } from "../portal.ts";
import {
  base64,
  createHttpError,
  mergeUrl,
  Payload,
  Status,
  verify,
} from "./deps.ts";

export type AuthState = { payload: Payload };
type Options = {
  clientRedirect?: Partial<URL>;
};

/**
 * Returns a `Handler` which verifys a JWT sent with the `Authorization` header.
 * If the JWT is invalid or not present a `Response` object with the status `401`
 * is thrown. Otherwise the JWT's `payload` is assigned to the `state` property.
 */
export function verifyJwt(
  key: CryptoKey | string,
  { clientRedirect }: Options = {},
) {
  return async (ctx: Context<AuthState>): Promise<void> => {
    try {
      const authHeader = ctx.request.headers.get("Authorization");
      console.log("authHeader:", authHeader);
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
    } catch {
      if (clientRedirect) {
        const redirectUrl = mergeUrl(new URL(ctx.request.url))(clientRedirect);
        throw new Response(
          getHtmlRedirect(redirectUrl),
          { status: Status.Unauthorized },
        );
      } else {
        throw createHttpError(Status.Unauthorized);
      }
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

function getHtmlRedirect(url: URL | string) {
  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8" />
</head>
<body>
<script>
window.location=${url}
</script>
</body>
</html>`;
}
