import {
  type AuthInput,
  type Context,
  isFunction,
  type Methods,
  type Options,
  respond,
} from "./deps.ts";
import { verifyJwt } from "../functions/jwt.ts";

function addVerifyFunctions(authInput: AuthInput) {
  const verify = isFunction(authInput.verification)
    ? authInput.verification
    : verifyJwt(authInput.verification);
  return { ...authInput, verification: verify };
}

export function rpcRespond(
  methods: Methods,
  options: Options & { methodsUrl?: URL } = {},
  authInput?: AuthInput | AuthInput[],
) {
  const authInputArray = authInput
    ? [authInput].flat().map(addVerifyFunctions)
    : undefined;
  return async <C extends Context>(ctx: C) => {
    const rpcMethods = options.methodsUrl
      ? { ...methods, ...await import(options.methodsUrl.pathname) }
      : methods;
    ctx.response = await respond(
      rpcMethods,
      options,
      authInputArray,
    )(ctx.request);
    return ctx;
  };
}
