import { AuthState, verifyJwt } from "../mod.ts";
import { create, getNumericDate, Header } from "./deps.ts";

type State = AuthState | { foo: string };

const key = await crypto.subtle.generateKey(
  { name: "HMAC", hash: "SHA-512" },
  true,
  ["sign", "verify"],
);
const header: Header = {
  alg: "HS512",
  typ: "JWT",
};
const app = new Portal<State>({ payload: {}, foo: "bar" });

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

await app.listen({ port: 8080 });
