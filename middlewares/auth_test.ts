import { Portal } from "../portal.ts";
import { verifyJwt } from "./auth.ts";
import {
  assertEquals,
  create,
  getResponseTextFromApp,
  Header,
  Payload,
} from "../test_deps.ts";

const key = await crypto.subtle.generateKey(
  { name: "HMAC", hash: "SHA-512" },
  true,
  ["sign", "verify"],
);
const header: Header = {
  alg: "HS512",
  typ: "JWT",
};
const payload: Payload = { iss: "Joe" };
const jwt = await create(header, payload, key);

Deno.test("overview", async function () {
  const app = new Portal<{ payload: typeof payload }>({ payload: {} });
  const getResponseText = getResponseTextFromApp(app);
  app.get(
    { pathname: "/login" },
    verifyJwt(key),
    (ctx) => new Response(ctx.state.payload.iss),
  );
  assertEquals(
    await getResponseText(
      new Request("https://example.com/login", {
        headers: { Authorization: `Bearer ${jwt}` },
      }),
    ),
    "Joe",
  );
  app.get(
    { pathname: "/login" },
    verifyJwt(key),
    (ctx) => new Response(ctx.state.payload.iss),
  );
  app.finally((ctx) => new Response(`finally ${ctx.response.status}`));
  assertEquals(
    await getResponseText(
      new Request("https://example.com/login", {
        headers: { Authorization: `Bearer INVALID` },
      }),
    ),
    "finally 401",
  );
});
