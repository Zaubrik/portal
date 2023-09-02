import { Context } from "./deps.ts";
import { type PayloadState, verify } from "./jwt.ts";
import {
  assertEquals,
  assertRejects,
  connInfo,
  create,
  createRoute,
  type Header,
} from "../test_deps.ts";
import { HttpError } from "./deps.ts";

const algorithm = "HS512" as const;
const cryptoKey = await crypto.subtle.generateKey(
  { name: "HMAC", hash: "SHA-512" },
  true,
  ["sign", "verify"],
);
const header: Header = {
  alg: algorithm,
  typ: "JWT",
};
const payload = { iss: "Joe" };
const jwt = await create(header, payload, cryptoKey);
const getLoginRoute = createRoute("GET")({ pathname: "/login" });

Deno.test("verify CryptoKeyInput", async function () {
  const returnedCtx = await getLoginRoute(
    await verify(cryptoKey),
  )(
    new Context<PayloadState>(
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

Deno.test("verify invalid CryptoKeyInput", async function () {
  const ctx = new Context<PayloadState>(
    new Request("https://example.com/login", {
      headers: { Authorization: `Bearer ${jwt}INVALID` },
    }),
    connInfo,
    { payload: {} },
  );
  await assertRejects(
    async () => {
      await getLoginRoute(await verify(cryptoKey))(ctx);
    },
    HttpError,
    "The serialization of the jwt is invalid.",
  );
});
