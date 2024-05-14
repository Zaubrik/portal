import {
  type AuthInput,
  create,
  decodeJwt,
  isObject,
  isString,
  isUndefined,
  isUrl,
  type Payload,
  semver,
  verify as verify,
  type VerifyOptions,
} from "./deps.ts";
import {
  fetchRsaCryptoKey,
  type HsAlgorithm,
  isCryptoKey,
  type RsaAlgorithm,
} from "./crypto/crypto_key.ts";

export type UpdateInput = {
  url: string | URL;
  algorithm: RsaAlgorithm;
  keySemVer?: string;
};
export type CryptoKeyOrUpdateInput =
  | CryptoKey
  | UpdateInput;

const defaultKeySemver = "v0.0.0";

// deno-lint-ignore no-explicit-any
function isUpdateInput(input: any): input is UpdateInput {
  try {
    return isObject(input) && isString(input.algorithm) &&
      (isString(input.url) || isUrl(input.url)) &&
      (isUndefined(input.keySemVer) ||
        !!semver.parse(input.keySemVer as string));
  } catch {
    return false;
  }
}

export function isCryptoKeyOrUpdateInput(
  input: unknown,
): input is CryptoKeyOrUpdateInput {
  return isCryptoKey(input) || isUpdateInput(input);
}

export function getJwtFromBearer(headers: Headers): string {
  const authHeader = headers.get("Authorization");
  if (authHeader === null) {
    throw new Error("No 'Authorization' header.");
  } else if (!authHeader.startsWith("Bearer ") || authHeader.length <= 7) {
    throw new Error("Invalid 'Authorization' header.");
  } else {
    return authHeader.slice(7);
  }
}

export async function createJwt(
  payload: Payload,
  input: CryptoKeyOrUpdateInput,
): Promise<string> {
  if (isUpdateInput(input)) {
    const method = "POST";
    const body = JSON.stringify(payload);
    const response = await fetch(input.url, { method, body });
    if (!response.ok) {
      throw Error("The fetching of the jwt was unsuccessful.");
    }
    const jwt = await response.text();
    // deno-lint-ignore no-explicit-any
    const [header] = decodeJwt(jwt) as any;
    if (header?.alg === input.algorithm) {
      return jwt;
    } else {
      throw new Error("The algorithms don't match.");
    }
  } else if (isCryptoKey(input)) {
    const alg = getAlg(input);
    const header = { alg, typ: "JWT" };
    const jwt = await create(header, payload, input);
    return jwt;
  } else {
    throw new Error("Invalid input.");
  }
}

export function ensureVerifyFunction(authInput: AuthInput) {
  const verification = authInput.verification;
  return {
    ...authInput,
    verification: typeof verification === "function"
      ? verification
      : verifyJwt(verification),
  };
}

export function verifyJwt(input: CryptoKeyOrUpdateInput) {
  const cryptoKeyPromiseOrNull = isUpdateInput(input)
    ? fetchRsaCryptoKey(input.url, input.algorithm)
    : null;
  return async (jwt: string, options?: VerifyOptions): Promise<Payload> => {
    const cryptoKeyOrNull = await cryptoKeyPromiseOrNull;
    if (isUpdateInput(input) && isCryptoKey(cryptoKeyOrNull)) {
      let cryptoKey = cryptoKeyOrNull;
      input.keySemVer ??= defaultKeySemver;
      const [header] = decodeJwt(jwt);
      if (isOutdated(input as Required<UpdateInput>, header)) {
        cryptoKey = await fetchRsaCryptoKey(input.url, input.algorithm);
        const payload = await verify(jwt, cryptoKey, options);
        input.keySemVer = (header as { ver: string }).ver;
        return payload;
      } else {
        return await verify(jwt, cryptoKey, options);
      }
    } else if (isCryptoKey(input)) {
      return await verify(jwt, input, options);
    } else {
      throw new Error("Invalid input.");
    }
  };
}

/**
 * Checks if the key used for jwt verification is outdated.
 */
export function isOutdated(
  input: Required<UpdateInput>,
  header: unknown,
): boolean {
  if (isObject(header)) {
    const { ver, alg } = header;
    const verSemver = semver.parse(ver as string);
    if (verSemver) {
      if (alg === input.algorithm) {
        const keySemVer = semver.parse(input.keySemVer);
        if (semver.equals(verSemver, keySemVer)) {
          return false;
        } else if (semver.greaterThan(verSemver, keySemVer)) {
          return true;
        } else {
          throw new Error("The jwt's version is outdated.");
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

export function getAlg(cryptoKey: CryptoKey): RsaAlgorithm | HsAlgorithm {
  const keyAlgorithm = cryptoKey.algorithm;
  if (isHashedKeyAlgorithm(keyAlgorithm)) {
    const { hash, name } = keyAlgorithm;
    if (name === "HMAC") {
      if (hash.name === "SHA-256") {
        return "HS256";
      } else if (hash.name === "SHA-384") {
        return "HS384";
      } else if (hash.name === "SHA-512") {
        return "HS512";
      }
    } else if (name === "RSASSA-PKCS1-v1_5") {
      if (hash.name === "SHA-256") {
        return "RS256";
      } else if (hash.name === "SHA-384") {
        return "RS384";
      } else if (hash.name === "SHA-512") {
        return "RS512";
      }
    }
  }
  throw new Error(`The CryptoKey '${cryptoKey.algorithm}' is not supported.`);
}

function isHashedKeyAlgorithm(
  // deno-lint-ignore no-explicit-any
  algorithm: Record<string, any>,
): algorithm is HmacKeyAlgorithm | RsaHashedKeyAlgorithm {
  return isString(algorithm.hash?.name);
}
