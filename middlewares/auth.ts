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
type PayloadPredicate = (payload: Payload) => boolean;
type Options = VerifyOptions & {
  predicates?: PayloadPredicate[];
  keyUrl: string | URL;
  algorithm: RsaAlgorithm;
  keySemVer?: string;
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

export function verifyJwt(
  cryptoKey: CryptoKey,
  predicates: PayloadPredicate[] = [],
) {
  return async <C extends Context<AuthState>>(ctx: C): Promise<C> => {
    try {
      const jwt = verifyBearer(ctx.request.headers);
      const payload = await verify(jwt, cryptoKey);
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

export async function verifyVersionedJwt(
  { keyUrl, algorithm, keySemVer = "0.0.0", predicates = [] }: Options,
) {
  const cryptoKey = await fetchRsaCryptoKey(keyUrl, algorithm);
  if (!isCryptoKey(cryptoKey)) {
    throw new Error("No 'cryptoKey' in production mode.");
  }
  const checkAndVerify = checkVersionAndVerify(cryptoKey, {
    keyUrl,
    algorithm,
    keySemVer,
  });
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
  { keyUrl, algorithm, keySemVer = "0.0.0" }: Options,
) {
  return async (jwt: string): Promise<Payload> => {
    const [header] = decodeJwt(jwt);
    if (isObject(header)) {
      const { ver, alg } = header;
      if (isString(ver) && semver.valid(ver)) {
        if (alg === algorithm) {
          if (semver.eq(ver, keySemVer)) {
            return await verify(jwt, cryptoKey);
          } else if (semver.gt(ver, keySemVer)) {
            cryptoKey = await fetchRsaCryptoKey(keyUrl, algorithm).catch(
              (error) => {
                throw createHttpError(
                  Status.InternalServerError,
                  error.message,
                );
              },
            );
            const payload = await verify(jwt, cryptoKey);
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
