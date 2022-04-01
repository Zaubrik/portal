import { Portal, verifyJwt } from "../mod.ts";
import { create, getNumericDate, Header, Payload } from "./deps.ts";

const key = await crypto.subtle.generateKey(
  { name: "HMAC", hash: "SHA-512" },
  true,
  ["sign", "verify"],
);
const header: Header = {
  alg: "HS512",
  typ: "JWT",
};
const app = new Portal<{ payload: Payload }>({ payload: {} });

app.get(
  { pathname: "/login" },
  async (_ctx) =>
    new Response(
      await create(header, { iss: "Joe", exp: getNumericDate(60) }, key),
    ),
);

app.get(
  { pathname: "/private" },
  verifyJwt(key),
  (ctx) => new Response(`Hello ${ctx.state.payload.iss}`),
);

console.log("Listening on http://0.0.0.0:8080");
await app.listen({ port: 8080 });
