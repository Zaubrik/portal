import {
  type AuthInput,
  type Context,
  ensureVerify,
  type Methods,
  type Options,
  respond,
} from "./deps.ts";

export function rpcRespond(
  methods: Methods,
  options: Options & { methodsUrl?: URL } = {},
  authInput?: AuthInput | AuthInput[],
) {
  const authInputArray = authInput
    ? [authInput].flat().map(ensureVerify)
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
