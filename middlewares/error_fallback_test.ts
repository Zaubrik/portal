// deno-lint-ignore-file
import { fallBack } from "./error_fallback.ts";
import { createHttpError, Status } from "../deps.ts";
import {
  assertEquals,
  connInfo,
  Context,
  createHandler,
  createRoute,
  identity,
} from "../test_deps.ts";

const allAndEverythingRoute = createRoute("ALL")({ pathname: "*" });
const ctx = new Context(
  new Request(`https://example.com/:books/:id`),
  connInfo,
);

function throwError<C extends Context>(ctx: C): C {
  throw new Error("normal error");
}
function throwNotFoundError<C extends Context>(ctx: C): C {
  throw new Deno.errors.NotFound();
}
function throwUriError<C extends Context>(ctx: C): C {
  throw new URIError();
}
function throwUnauthorizedError<C extends Context>(ctx: C): C {
  throw createHttpError(Status.Unauthorized, "Not so secret message");
}
function throwUnauthorizedErrorExposed<C extends Context>(ctx: C): C {
  throw createHttpError(Status.Unauthorized, "Secret message", {
    expose: false,
  });
}
function throwHttpError<C extends Context>(ctx: C): C {
  throw createHttpError(undefined, "Secret message");
}
function throwHttpErrorExposed<C extends Context>(ctx: C): C {
  throw createHttpError(undefined, "Not so secret message", {
    expose: true,
  });
}

Deno.test("HttpError", async function () {
  const handler1 = createHandler(Context)(
    throwHttpError,
  )(fallBack)(identity);
  const response1 = await handler1(
    new Request("https://example.com/books"),
    connInfo,
  );
  assertEquals(response1.status, 500);
  assertEquals(await response1.text(), "Internal Server Error");
  const handler2 = createHandler(Context)(
    throwHttpErrorExposed,
  )(fallBack)(identity);
  const response2 = await handler2(
    new Request("https://example.com/books"),
    connInfo,
  );
  assertEquals(response2.status, 500);
  assertEquals(await response2.text(), "Not so secret message");
});

Deno.test("HttpError: UnauthorizedError", async function () {
  const handler1 = createHandler(Context)(
    throwUnauthorizedError,
  )(fallBack)(identity);
  const response1 = await handler1(
    new Request("https://example.com/books"),
    connInfo,
  );
  assertEquals(response1.status, 401);
  assertEquals(await response1.text(), "Not so secret message");
  const handler2 = createHandler(Context)(
    throwUnauthorizedErrorExposed,
  )(fallBack)(identity);
  const response2 = await handler2(
    new Request("https://example.com/books"),
    connInfo,
  );
  assertEquals(response2.status, 401);
  assertEquals(await response2.text(), "Unauthorized");
});

Deno.test("URIError", async function () {
  const handler = createHandler(Context)(
    throwUriError,
  )(fallBack)(identity);
  const response = await handler(
    new Request("https://example.com/books"),
    connInfo,
  );
  assertEquals(response.status, 400);
});

Deno.test("NotFound error", async function () {
  const handler = createHandler(Context)(
    throwNotFoundError,
  )(fallBack)(identity);
  const response = await handler(
    new Request("https://example.com/books"),
    connInfo,
  );
  assertEquals(response.status, 404);
});

Deno.test("normal error", async function () {
  const handler = createHandler(Context)(
    throwError,
  )(fallBack)(identity);
  const response = await handler(
    new Request("https://example.com/books"),
    connInfo,
  );
  assertEquals(response.status, 500);
});
