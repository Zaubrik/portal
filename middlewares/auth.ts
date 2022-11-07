import {
  Context,
  createHttpError,
  decodeJwt,
  hasProperty,
  isHttpError,
  isNull,
  isObject,
  isString,
  Payload,
  semver,
  Status,
  verify,
  VerifyOptions,
} from "../deps.ts";
import { importRsaKeyFromPem } from "../util/crypto/crypto_key.ts";

export type AuthState = { payload: Payload };
type PayloadPredicate = (payload: Payload) => boolean;
type Options = VerifyOptions & {
  predicates?: PayloadPredicate[];
  keyUrl?: string | URL;
};

let keyVersion = "0.0.0";
if (!semver.valid(keyVersion)) {
  throw new Error("The assigned key version is an invalid 'SemVer'.");
}

/**
 * A curried middleware which takes `CryptoKey` and `Options` and verifys a JWT
 * sent with the `Authorization` header.  If the JWT is invalid or not present
 * an `HttpError` with the status `401` is thrown. Otherwise the JWT's `payload`
 * is assigned to the `state`.
 */
export function verifyBearer(cryptoKey: CryptoKey, options: Options = {}) {
  const predicates = options?.predicates || [];
  return async <C extends Context<AuthState>>(ctx: C): Promise<C> => {
    try {
      const authHeader = ctx.request.headers.get("Authorization");
      if (isNull(authHeader)) {
        throw new Error("No 'Authorization' header.");
      } else if (!authHeader.startsWith("Bearer ") || authHeader.length <= 7) {
        throw new Error("Invalid 'Authorization' header.");
      } else {
        const jwt = authHeader.slice(7);
        const keyAndVerMaybe = await checkVersion(options.keyUrl, jwt);
        if (keyAndVerMaybe) {
          cryptoKey = keyAndVerMaybe.cryptoKey;
        }
        if (!(cryptoKey instanceof CryptoKey)) {
          throw createHttpError(
            Status.InternalServerError,
            "Invalid 'cryptoKey'.",
          );
        }
        const payload = await verify(jwt, cryptoKey, options);
        if (keyAndVerMaybe) {
          keyVersion = keyAndVerMaybe.ver;
        }
        if (predicates.every((predicate) => predicate(payload))) {
          ctx.state.payload = payload;
        } else {
          throw new Error("The payload does not satisfy all predicates.");
        }
      }
      return ctx;
    } catch (error) {
      throw isHttpError(error) ? error : createUnauthorizedError(error);
    }
  };
}

export async function fetchRsaCryptoKey(
  keyUrl: string | URL,
  alg: Parameters<typeof importRsaKeyFromPem>[1],
) {
  const pem = await fetch(keyUrl).then((res) => res.text());
  return await importRsaKeyFromPem(pem, alg, "public");
}

async function checkVersion(
  keyUrl: string | URL | undefined,
  jwt: string,
): Promise<{ cryptoKey: CryptoKey; ver: string } | null> {
  if (keyUrl) {
    const [header] = decodeJwt(jwt);
    if (isObject(header)) {
      const { ver, alg } = header;
      if (isString(ver) && semver.valid(ver)) {
        if (alg === "RS256" || alg === "RS384" || alg === "RS512") {
          if (semver.gt(ver, keyVersion)) {
            try {
              const cryptoKey = await fetchRsaCryptoKey(keyUrl, alg);
              return { cryptoKey, ver };
            } catch (error) {
              throw createHttpError(Status.InternalServerError, error.message);
            }
          }
        } else {
          throw new Error(
            "The jwt's 'alg' must be 'RS256', 'RS384' or 'RS512'.",
          );
        }
      } else {
        throw new Error("The jwt has an invalid 'SemVer'.");
      }
    }
  }
  return null;
}

function createUnauthorizedError(error: Error) {
  return createHttpError(Status.Unauthorized, error.message, {
    expose: false,
    headers: new Headers({ "WWW-Authenticate": "Bearer" }),
  });
}
