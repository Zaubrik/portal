import { AuthState, verifyJwt } from "./auth.ts";
import {
  assertEquals,
  assertRejects,
  connInfo,
  Context,
  create,
  createRoute,
  Header,
  isNull,
  isPresent,
  isString,
} from "../test_deps.ts";
import { HttpError } from "../deps.ts";

const key = await crypto.subtle.generateKey(
  { name: "HMAC", hash: "SHA-512" },
  true,
  ["sign", "verify"],
);
const header: Header = {
  alg: "HS512",
  typ: "JWT",
};
const payload = { iss: "Joe" };
const jwt = await create(header, payload, key);
const getLoginRoute = createRoute("GET")({ pathname: "/login" });

Deno.test("verifyJwt valid jwt", async function () {
  const returnedCtx = await getLoginRoute(verifyJwt(key))(
    new Context<AuthState>(
      new Request("https://example.com/login", {
        headers: { Authorization: `Bearer ${jwt}` },
      }),
      connInfo,
      { payload: { iss: "Never" } },
    ),
  );
  assertEquals(
    returnedCtx.state.payload.iss,
    "Joe",
  );
});

Deno.test("verifyJwt invalid jwt", async function () {
  const ctx = new Context<AuthState>(
    new Request("https://example.com/login", {
      headers: { Authorization: `Bearer ${jwt}INVALID` },
    }),
    connInfo,
    { payload: {} },
  );
  await assertRejects(
    async () => {
      await getLoginRoute(verifyJwt(key))(ctx);
    },
    HttpError,
    "The serialization of the jwt is invalid.",
  );
});

Deno.test("verifyJwt valid jwt with predicates", async function () {
  const ctx = new Context<AuthState>(
    new Request("https://example.com/login", {
      headers: { Authorization: `Bearer ${jwt}` },
    }),
    connInfo,
  );
  const returnedCtx = await getLoginRoute(
    verifyJwt(key, [(payload) => isString(payload.iss)]),
  )(ctx);
  assertEquals(
    returnedCtx.state.payload.iss,
    "Joe",
  );
});

Deno.test("verifyJwt invalid jwt with predicates", async function () {
  const ctx = new Context<AuthState>(
    new Request("https://example.com/login", {
      headers: { Authorization: `Bearer ${jwt}` },
    }),
    connInfo,
  );
  await assertRejects(
    async () => {
      await getLoginRoute(
        verifyJwt(key, [(payload) => isNull(payload.iss)]),
      )(ctx);
    },
    Error,
    "The payload does not satisfy all predicates.",
  );
  await assertRejects(
    async () => {
      await getLoginRoute(
        verifyJwt(
          key,
          [
            (payload) => isPresent(payload.iss),
            (payload) => isNull(payload.iss),
            (payload) => isPresent(payload.iss),
          ],
        ),
      )(ctx);
    },
    Error,
    "The payload does not satisfy all predicates.",
  );
});
