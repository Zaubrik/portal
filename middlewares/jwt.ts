import {
  type Context,
  createHttpError,
  decodeJwt,
  fetchRsaCryptoKey,
  hasNotProperty,
  hasProperty,
  isHttpError,
  isObject,
  isString,
  type Payload,
  type RsaAlgorithm,
  semver,
  Status,
  verify as verifyOriginal,
  type VerifyOptions,
} from "./deps.ts";
import { getJwtFromBearer } from "../functions/jwt.ts";

export type PayloadState = { payload: Payload };

export type VerifyJwtInput = CryptoKey;
export type VerifyJwtAndFetchKeyInput = {
  keyUrl: string | URL;
  algorithm: RsaAlgorithm;
};
export type VerifyJwtFetchAndUpdateKeyInput = VerifyJwtAndFetchKeyInput & {
  keySemVer: string;
};
export type VerifyInput =
  | VerifyJwtInput
  | VerifyJwtAndFetchKeyInput
  | VerifyJwtFetchAndUpdateKeyInput;

function isCryptoKey(input: unknown): input is CryptoKey {
  return input instanceof CryptoKey;
}

function isVerifyJwtInput(
  input: VerifyInput,
): input is VerifyJwtInput {
  return isCryptoKey(input);
}
function isVerifyJwtAndFetchKeyInput(
  input: VerifyInput,
): input is VerifyJwtAndFetchKeyInput {
  return isObject(input) &&
    hasNotProperty("keySemVer")(input) &&
    hasProperty("keyUrl")(input) && hasProperty("algorithm")(input);
}
function isVerifyJwtFetchAndUpdateKeyInput(
  input: VerifyInput,
): input is VerifyJwtFetchAndUpdateKeyInput {
  return isVerifyJwtAndFetchKeyInput(input) &&
    hasProperty("keySemVer")(input);
}

async function getCryptoKey(input: VerifyInput): Promise<CryptoKey> {
  if (isVerifyJwtInput(input)) {
    return input;
  } else {
    return await fetchRsaCryptoKey(input.keyUrl, input.algorithm).catch(
      throwInternalServerError,
    );
  }
}

export async function verify(input: VerifyInput, options?: VerifyOptions) {
  let cryptoKey = await getCryptoKey(input);
  return async <C extends Context<PayloadState>>(ctx: C): Promise<C> => {
    try {
      const jwt = getJwtFromBearer(ctx.request.headers);
      if (isVerifyJwtFetchAndUpdateKeyInput(input)) {
        const [header] = decodeJwt(jwt);
        if (isOutdated(input, header)) {
          cryptoKey = await getCryptoKey(input);
          const payload = await verifyOriginal(jwt, cryptoKey, options);
          input.keySemVer = (header as { ver: string }).ver;
          ctx.state.payload = payload;
          return ctx;
        }
      }
      const payload = await verifyOriginal(jwt, cryptoKey, options);
      ctx.state.payload = payload;
      return ctx;
    } catch (error) {
      throw isHttpError(error) ? error : createUnauthorizedError(error);
    }
  };
}

export function isOutdated(
  input: VerifyJwtFetchAndUpdateKeyInput,
  header: unknown,
): boolean {
  if (isObject(header)) {
    const { ver, alg } = header;
    if (isString(ver) && semver.valid(ver)) {
      if (alg === input.algorithm) {
        if (semver.eq(ver, input.keySemVer)) {
          return false;
        } else if (semver.gt(ver, input.keySemVer)) {
          return true;
        } else {
          throw new Error(
            "The jwt's version is outdated.",
          );
        }
      } else {
        throw new Error(
          "The jwt's 'alg' claim doesn't match the predefined algorithm.",
        );
      }
    } else {
      throw new Error("The jwt has no or an invalid 'ver' header.");
    }
  } else {
    throw new Error("The jwt has an invalid 'Header'.");
  }
}

function createUnauthorizedError(error: Error) {
  return createHttpError(Status.Unauthorized, error.message, {
    expose: false,
    headers: new Headers({ "WWW-Authenticate": "Bearer" }),
  });
}

function throwInternalServerError(error: Error): never {
  throw createHttpError(
    Status.InternalServerError,
    error.message,
  );
}
