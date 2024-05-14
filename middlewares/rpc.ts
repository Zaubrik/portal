import {
  type AuthInput,
  type Context,
  type Methods,
  type Options,
  respond,
} from "./deps.ts";
import { ensureVerifyFunction } from "../functions/jwt.ts";

export function rpcRespond(
  methods: Methods,
  options: Options & { methodsUrl?: URL } = {},
  authInput?: AuthInput | AuthInput[],
) {
  const authInputArray = authInput
    ? [authInput].flat().map(ensureVerifyFunction)
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
