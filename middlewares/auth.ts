import {
  Context,
  createHttpError,
  decodeJwt,
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
import { fetchRsaCryptoKey, RsaAlgorithm } from "../util/crypto/crypto_key.ts";

export type AuthState = { payload: Payload };
type FetchData = {
  keyUrl: string | URL;
  algorithm: RsaAlgorithm;
  keySemVer?: string;
};
type PayloadPredicate = (payload: Payload) => boolean;
type Options = VerifyOptions & {
  predicates?: PayloadPredicate[];
  isDevelopment?: boolean;
};

function isCryptoKey(input: unknown): input is CryptoKey {
  return input instanceof CryptoKey;
}

function verifyBearer(headers: Headers): string {
  const authHeader = headers.get("Authorization");
  if (isNull(authHeader)) {
    throw new Error("No 'Authorization' header.");
  } else if (!authHeader.startsWith("Bearer ") || authHeader.length <= 7) {
    throw new Error("Invalid 'Authorization' header.");
  } else {
    return authHeader.slice(7);
  }
}

/**
 * A curried middleware which takes `CryptoKey` and `Options` and verifys a JWT
 * sent with the `Authorization` header.  If the JWT is invalid or not present
 * an `HttpError` with the status `401` is thrown. Otherwise the JWT's `Payload`
 * is assigned to the `state`.
 */
export function verifyJwt(cryptoKey: CryptoKey, options: Options = {}) {
  const predicates = options?.predicates || [];
  return async <C extends Context<AuthState>>(ctx: C): Promise<C> => {
    try {
      const jwt = verifyBearer(ctx.request.headers);
      const payload = await verify(jwt, cryptoKey, options);
      if (predicates.every((predicate) => predicate(payload))) {
        ctx.state.payload = payload;
      } else {
        throw new Error("The payload does not satisfy all predicates.");
      }
      return ctx;
    } catch (error) {
      throw createUnauthorizedError(error);
    }
  };
}

/**
 * A curried middleware which takes `FetchData` and `Options` and verifys a JWT
 * sent with the `Authorization` header. It also checks the `ver` header, which
 * refers to the `CryptoKey`s version, and fetches a new `CryptoKey` if required.
 * If the JWT is invalid or not present an `HttpError` with the status `401` is
 * thrown. Otherwise the JWT's `Payload` is assigned to the `state`.
 */
export async function verifyVersionedJwt(
  { keyUrl, algorithm, keySemVer = "0.0.0" }: FetchData,
  options: Options = {},
) {
  const predicates = options?.predicates || [];
  const cryptoKey = options.isDevelopment
    ? {} as any
    : await fetchRsaCryptoKey(keyUrl, algorithm);
  if (!options.isDevelopment && !isCryptoKey(cryptoKey)) {
    throw new Error("No 'cryptoKey'.");
  }
  const checkAndVerify = checkVersionAndVerify(cryptoKey, {
    keyUrl,
    algorithm,
    keySemVer,
  }, options);
  return async <C extends Context<AuthState>>(ctx: C): Promise<C> => {
    try {
      const jwt = verifyBearer(ctx.request.headers);
      const payload = await checkAndVerify(jwt);
      if (predicates.every((predicate) => predicate(payload))) {
        ctx.state.payload = payload;
      } else {
        throw new Error("The payload does not satisfy all predicates.");
      }
      return ctx;
    } catch (error) {
      throw isHttpError(error) ? error : createUnauthorizedError(error);
    }
  };
}

function checkVersionAndVerify(
  cryptoKey: CryptoKey,
  { keyUrl, algorithm, keySemVer }: Required<FetchData>,
  options: Options,
) {
  return async (jwt: string): Promise<Payload> => {
    const [header] = decodeJwt(jwt);
    if (isObject(header)) {
      const { ver, alg } = header;
      if (isString(ver) && semver.valid(ver)) {
        if (alg === algorithm) {
          if (semver.eq(ver, keySemVer)) {
            return await verify(jwt, cryptoKey, options);
          } else if (semver.gt(ver, keySemVer)) {
            cryptoKey = await fetchRsaCryptoKey(keyUrl, algorithm).catch(
              (error) => {
                throw createHttpError(
                  Status.InternalServerError,
                  error.message,
                );
              },
            );
            const payload = await verify(jwt, cryptoKey, options);
            keySemVer = ver;
            return payload;
          } else {
            throw new Error(
              "The jwt's version is not valid anymore.",
            );
          }
        } else {
          throw new Error(
            "The jwt's 'alg' claim doesn't match the predefined algorithm.",
          );
        }
      } else {
        throw new Error("The jwt has an invalid 'SemVer'.");
      }
    } else {
      throw new Error("The jwt has an invalid 'Header'.");
    }
  };
}

function createUnauthorizedError(error: Error) {
  return createHttpError(Status.Unauthorized, error.message, {
    expose: false,
    headers: new Headers({ "WWW-Authenticate": "Bearer" }),
  });
}
