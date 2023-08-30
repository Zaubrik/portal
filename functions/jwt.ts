import {
  create as createOriginal,
  decodeJwt,
  isObject,
  isString,
  isUndefined,
  isUrl,
  type Payload,
  semver,
  verify as verifyOriginal,
  type VerifyOptions,
} from "./deps.ts";
import {
  fetchRsaCryptoKey,
  type HsAlgorithm,
  isCryptoKey,
  type RsaAlgorithm,
} from "./crypto/crypto_key.ts";

export type CryptoKeyInput = {
  cryptoKey: CryptoKey;
  algorithm: RsaAlgorithm | HsAlgorithm;
};
export type UpdateInput = {
  url: string | URL;
  algorithm: RsaAlgorithm;
  keySemVer?: string;
};
export type CryptoKeyOrUpdateInput =
  | CryptoKeyInput
  | UpdateInput;

const defaultKeySemver = "v0.0.0";

// deno-lint-ignore no-explicit-any
function isUpdateInput(input: any): input is UpdateInput {
  return isObject(input) && isString(input.algorithm) &&
    (isString(input.url) || isUrl(input.url)) &&
    (isUndefined(input.keySemVer) || !!semver.valid(input.keySemVer as string));
}

async function getCryptoKey(input: CryptoKeyOrUpdateInput): Promise<CryptoKey> {
  if (isUpdateInput(input)) {
    return await fetchRsaCryptoKey(input.url, input.algorithm);
  } else {
    return input.cryptoKey;
  }
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

export async function create(
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
  } else {
    if (isCryptoKey(input.cryptoKey)) {
      const header = { alg: input.algorithm, typ: "JWT" };
      const jwt = await createOriginal(header, payload, input.cryptoKey);
      return jwt;
    } else {
      throw new Error("The 'key' property of the input is not an CryptoKey.");
    }
  }
}

export async function verify(
  input: CryptoKeyOrUpdateInput,
  options?: VerifyOptions,
) {
  let cryptoKey = await getCryptoKey(input);
  return async (jwt: string): Promise<Payload> => {
    if (isUpdateInput(input)) {
      input.keySemVer ??= defaultKeySemver;
      const [header] = decodeJwt(jwt);
      if (isOutdated(input as Required<UpdateInput>, header)) {
        cryptoKey = await getCryptoKey(input);
        const payload = await verifyOriginal(jwt, cryptoKey, options);
        input.keySemVer = (header as { ver: string }).ver;
        return payload;
      }
    }
    return await verifyOriginal(jwt, cryptoKey, options);
  };
}

export function isOutdated(
  input: Required<UpdateInput>,
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
