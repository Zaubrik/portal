import { Context } from "../portal.ts";
import { Payload, verify } from "./deps.ts";

export type AuthState = { payload: Payload };

/**
 * Returns a `Handler` which verifys a JWT sent with the `Authorization` header.
 * If the JWT is invalid or not present a `Response` object with the status `401`
 * is thrown. Otherwise the JWT's `payload` is assigned to the `state` property.
 */
export function verifyJwt(key: CryptoKey) {
  return async (ctx: Context<AuthState>): Promise<void> => {
    try {
      const authHeader = ctx.request.headers.get("Authorization");
      if (
        !authHeader ||
        !authHeader.startsWith("Bearer ") ||
        authHeader.length <= 7
      ) {
        throw new Error("No or invalid 'Authorization' header.");
      } else {
        const payload = await verify(authHeader.slice(7), key);
        ctx.state.payload = payload;
      }
    } catch (_err) {
      throw new Response("Unauthorized", { status: 401 });
    }
  };
}
