import {
  type AuthInput,
  type Context,
  isFunction,
  type Methods,
  type Options,
  respond,
} from "./deps.ts";
import { isCryptoKeyOrUpdateInput, verifyJwt } from "../functions/jwt.ts";

export function rpcRespond(
  methods: Methods,
  options: Options & { methodsUrl?: URL } = {},
  authInput?: AuthInput | AuthInput[],
) {
  const verificationInputOrUndefined = authInput?.verification;
  const verify = isFunction(verificationInputOrUndefined)
    ? verificationInputOrUndefined
    : isCryptoKeyOrUpdateInput(verificationInputOrUndefined)
    ? verifyJwt(verificationInputOrUndefined)
    : undefined;
  return async <C extends Context>(ctx: C) => {
    const rpcMethods = options.methodsUrl
      ? { ...methods, ...await import(options.methodsUrl.pathname) }
      : methods;
    const newAuthInput = authInput
      ? verify ? { ...authInput, verification: verify } : authInput
      : undefined;
    ctx.response = await respond(
      rpcMethods,
      options,
      newAuthInput,
    )(ctx.request);
    return ctx;
  };
}
