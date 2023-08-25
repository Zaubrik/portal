export {
  assertEquals,
  assertNotEquals,
  assertRejects,
  assertThrows,
} from "https://deno.land/std@0.200.0/testing/asserts.ts";
export { delay } from "https://deno.land/std@0.200.0/async/delay.ts";
export {
  compose,
  composeSync,
  createHandler,
  createRoute,
} from "https://dev.zaubrik.com/composium@v0.1.1/mod.ts";
export {
  create,
  getNumericDate,
  type Header,
  type Payload,
  verify,
} from "https://deno.land/x/djwt@v2.9.1/mod.ts";
export { identity } from "https://dev.zaubrik.com/sorcery@v0.1.4/higher_order.js";
export {
  isNull,
  isPresent,
  isString,
} from "https://dev.zaubrik.com/sorcery@v0.1.4/type.js";

export const connInfo = {
  localAddr: { transport: "tcp" as const, hostname: "127.0.0.1", port: 8080 },
  remoteAddr: { transport: "tcp" as const, hostname: "127.0.0.1", port: 48951 },
};
