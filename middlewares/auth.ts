import {
  Context,
  createHttpError,
  isNull,
  Payload,
  Status,
  verify,
} from "../deps.ts";

export type AuthState = { payload: Payload };
type PayloadPredicate = (payload: Payload) => boolean;

/**
 * A curried middleware which takes a key or path and verifys a JWT sent with the
 * `Authorization` header.  If the JWT is invalid or not present an `HttpError`
 * with the status `401` is thrown. Otherwise the JWT's `payload` is assigned to
 * the `state`.
 */
export function verifyBearer(
  cryptoKey: CryptoKey,
  ...payloadPredicates: PayloadPredicate[] | [PayloadPredicate[]]
) {
  const predicates = payloadPredicates.flat();
  return async <C extends Context<AuthState>>(ctx: C): Promise<C> => {
    try {
      const authHeader = ctx.request.headers.get("Authorization");
      if (isNull(authHeader)) {
        throw new Error("No 'Authorization' header.");
      } else if (!authHeader.startsWith("Bearer ") || authHeader.length <= 7) {
        throw new Error("Invalid 'Authorization' header.");
      } else {
        const jwt = authHeader.slice(7);
        const payload = await verify(jwt, cryptoKey);
        if (predicates.every((predicate) => predicate(payload))) {
          ctx.state.payload = payload;
        } else {
          throw new Error("The payload does not satisfy all predicates.");
        }
      }
      return ctx;
    } catch (error) {
      throw createUnauthorizedError(error);
    }
  };
}

function createUnauthorizedError(error: Error) {
  return createHttpError(Status.Unauthorized, error.message, {
    expose: false,
    headers: new Headers({ "WWW-Authenticate": "Bearer" }),
  });
}
