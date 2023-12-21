import {
  type Context,
  createHttpError,
  isDefined,
  isEmpty,
  isHttpError,
  isPresent,
  isRegExp,
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

function mergeAudience(
  oldAudience: VerifyOptions["audience"],
  newAudience: VerifyOptions["audience"],
) {
  if (isRegExp(newAudience)) {
    return newAudience;
  } else if (isDefined(newAudience)) {
    return isRegExp(oldAudience)
      ? newAudience
      : [oldAudience, newAudience].flat().filter(isPresent);
  } else {
    return oldAudience;
  }
}

function mergePredicates(
  oldPredicates: VerifyOptions["predicates"],
  newPredicates: VerifyOptions["predicates"],
) {
  const predicates = [oldPredicates, newPredicates].flat().filter(isPresent);
  return isEmpty(predicates) ? undefined : predicates;
}

export type CurriedVerifyReturnType = ReturnType<typeof curriedVerify>;

export function curriedVerify(
  input: CryptoKeyOrUpdateInput,
  options: VerifyOptions = {},
) {
  const verifyJwtCurried = verifyJwt(input);
  return (moreOptions: VerifyOptions = {}) => {
    return async <C extends Context<PayloadState>>(ctx: C): Promise<C> => {
      try {
        const mergedOptions: VerifyOptions = { ...options, ...moreOptions };
        const predicates = mergePredicates(
          options.predicates,
          moreOptions.predicates,
        );
        const audience = mergeAudience(options.audience, moreOptions.audience);
        mergedOptions.predicates = predicates;
        mergedOptions.audience = audience;
        const jwt = getJwtFromBearer(ctx.request.headers);
        const payload = await verifyJwtCurried(jwt, mergedOptions);
        ctx.state.payload = payload;
        return ctx;
      } catch (error) {
        throw isHttpError(error) ? error : createUnauthorizedError(error);
      }
    };
  };
}

export function verify(
  input: CryptoKeyOrUpdateInput,
  options?: VerifyOptions,
) {
  return curriedVerify(input)(options);
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
