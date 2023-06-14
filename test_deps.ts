export {
  assertEquals,
  assertNotEquals,
  assertRejects,
  assertThrows,
} from "https://deno.land/std@0.190.0/testing/asserts.ts";
export { delay } from "https://deno.land/std@0.190.0/async/delay.ts";
export {
  compose,
  composeSync,
  Context,
  createHandler,
  createRoute,
  listen,
} from "https://dev.zaubrik.com/composium@v0.0.8/mod.ts";
export {
  create,
  getNumericDate,
  type Header,
  type Payload,
  verify,
} from "https://deno.land/x/djwt@v2.8/mod.ts";
export { identity } from "https://dev.zaubrik.com/sorcery@v0.1.0/higher_order.js";
export {
  isNull,
  isPresent,
  isString,
} from "https://dev.zaubrik.com/sorcery@v0.1.0/type.js";

export const connInfo = {
  localAddr: { transport: "tcp" as const, hostname: "127.0.0.1", port: 8080 },
  remoteAddr: { transport: "tcp" as const, hostname: "127.0.0.1", port: 48951 },
};
