import { AuthState, verifyBearer } from "./auth.ts";
import {
  assertEquals,
  assertRejects,
  connInfo,
  create,
  Header,
  isNull,
  isPresent,
  isString,
} from "../test_deps.ts";
import { Context, createRoute, HttpError } from "../deps.ts";

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
const getVerificationRoute = createRoute("GET")({ pathname: "/login/:jwt" });
const getLoginRoute = createRoute("GET")({ pathname: "/login" });

Deno.test("verifyBearer valid jwt", async function () {
  const returnedCtx = await getLoginRoute(verifyBearer(key))(
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

Deno.test("verifyBearer invalid jwt", async function () {
  const ctx = new Context<AuthState>(
    new Request("https://example.com/login", {
      headers: { Authorization: `Bearer ${jwt}INVALID` },
    }),
    connInfo,
    { payload: {} },
  );
  await assertRejects(
    async () => {
      await getLoginRoute(verifyBearer(key))(ctx);
    },
    HttpError,
    "The serialization of the jwt is invalid.",
  );
});

Deno.test("verifyBearer valid jwt with predicates", async function () {
  const ctx = new Context<AuthState>(
    new Request("https://example.com/login", {
      headers: { Authorization: `Bearer ${jwt}` },
    }),
    connInfo,
  );
  const returnedCtx = await getLoginRoute(
    verifyBearer(key, (payload) => isString(payload.iss)),
  )(ctx);
  assertEquals(
    returnedCtx.state.payload.iss,
    "Joe",
  );
});

Deno.test("verifyBearer invalid jwt with predicates", async function () {
  const ctx = new Context<AuthState>(
    new Request("https://example.com/login", {
      headers: { Authorization: `Bearer ${jwt}` },
    }),
    connInfo,
  );
  await assertRejects(
    async () => {
      await getLoginRoute(
        verifyBearer(key, (payload) => isNull(payload.iss)),
      )(ctx);
    },
    Error,
    "The payload does not satisfy all predicates.",
  );
  await assertRejects(
    async () => {
      await getLoginRoute(
        verifyBearer(
          key,
          (payload) => isPresent(payload.iss),
          (payload) => isNull(payload.iss),
          (payload) => isPresent(payload.iss),
        ),
      )(ctx);
    },
    Error,
    "The payload does not satisfy all predicates.",
  );
});
