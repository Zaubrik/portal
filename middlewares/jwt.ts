import {
  type Context,
  createHttpError,
  isHttpError,
  type Payload,
  Status,
  type VerifyOptions,
} from "./deps.ts";
import {
  createJwt,
  type CryptoKeyOrUpdateInput,
  getJwtFromBearer,
  verifyJwt,
} from "../functions/jwt.ts";

export type PayloadState = { payload: Payload };

export function verify(
  input: CryptoKeyOrUpdateInput,
  options?: VerifyOptions,
) {
  const verifyJwtCurried = verifyJwt(input);
  return async <C extends Context<PayloadState>>(ctx: C): Promise<C> => {
    try {
      const jwt = getJwtFromBearer(ctx.request.headers);
      const payload = await verifyJwtCurried(jwt, options);
      ctx.state.payload = payload;
      return ctx;
    } catch (error) {
      throw isHttpError(error) ? error : createUnauthorizedError(error);
    }
  };
}

export function create(
  payload: Payload,
  input: CryptoKeyOrUpdateInput,
) {
  return async <C extends Context>(ctx: C): Promise<C> => {
    try {
      const jwt = await createJwt(payload, input);
      ctx.response = new Response(jwt);
      return ctx;
    } catch (error) {
      throw isHttpError(error) ? error : createHttpError(
        Status.InternalServerError,
        error.message,
      );
    }
  };
}

function createUnauthorizedError(error: Error) {
  return createHttpError(Status.Unauthorized, error.message, {
    expose: false,
    headers: new Headers({ "WWW-Authenticate": "Bearer" }),
  });
}
