import {
  Context,
  createHttpError,
  decode,
  isHttpError,
  isNull,
  Payload,
  semver,
  Status,
  verify,
  VerifyOptions,
} from "../deps.ts";

export type AuthState = { payload: Payload };
type PayloadPredicate = (payload: Payload) => boolean;
type Options = VerifyOptions & {
  predicates?: PayloadPredicate[];
  keyUrl: string | URL;
};

export const mockJwt =
  "eyJhbGciOiJSUzM4NCIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiYWRtaW4iOnRydWUsImlhdCI6MTUxNjIzOTAyMn0.o1hC1xYbJolSyh0-bOY230w22zEQSk5TiBfc-OCvtpI2JtYlW-23-8B48NpATozzMHn0j3rE0xVUldxShzy0xeJ7vYAccVXu2Gs9rnTVqouc-UZu_wJHkZiKBL67j8_61L6SXswzPAQu4kVDwAefGf5hyYBUM-80vYZwWPEpLI8K4yCBsF6I9N1yQaZAJmkMp_Iw371Menae4Mp4JusvBJS-s6LrmG2QbiZaFaxVJiW8KlUkWyUCns8-qFl5OMeYlgGFsyvvSHvXCzQrsEXqyCdS4tQJd73ayYA4SPtCb9clz76N1zE5WsV4Z0BYrxeb77oA7jJhh994RAPzCG0hmQ";
export const mockPublicKeyPem = `-----BEGIN PUBLIC KEY-----
MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAu1SU1LfVLPHCozMxH2Mo
4lgOEePzNm0tRgeLezV6ffAt0gunVTLw7onLRnrq0/IzW7yWR7QkrmBL7jTKEn5u
+qKhbwKfBstIs+bMY2Zkp18gnTxKLxoS2tFczGkPLPgizskuemMghRniWaoLcyeh
kd3qqGElvW/VDL5AaWTg0nLVkjRo9z+40RQzuVaE8AkAFmxZzow3x+VJYKdjykkJ
0iT9wCS0DRTXu269V264Vf/3jvredZiKRkgwlL9xNAwxXFg0x/XFw005UWVRIkdg
cKWTjpBP2dPwVZ4WWC+9aGVd+Gyn1o0CLelf4rEjGoXbAAEgAqeGUxrcIlbjXfbc
mwIDAQAB
-----END PUBLIC KEY-----`;
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
export function verifyBearer(cryptoKey: CryptoKey, options: Options) {
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
        const payload = await verify(jwt, cryptoKey, options);
        if (keyAndVerMaybe) {
          keyVersion = keyAndVerMaybe.ver;
        }
        if ((predicates || []).every((predicate) => predicate(payload))) {
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

async function fetchCryptoKey() {
  const pem = isDevelopment
    ? mockPublicKeyPem
    : await fetch(jwtUrl).then((res) => res.text());
  return await importRsaKeyFromPem(pem, "RS384", "public");
}

async function checkVersion() {
  if (keyUrl) {
    const [header] = decode(jwt);
    if (header?.ver && semver.valid(header.ver)) {
      if (semver.gt(header.ver, keyVersion)) {
        try {
          const cryptoKey = await fetchCryptoKey();
          return { cryptoKey, ver: header.ver };
        } catch (error) {
          throw createHttpError(Status.InternalServerError, error.message);
        }
      }
    } else {
      throw new Error("The jwt has an invalid 'SemVer'.");
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
