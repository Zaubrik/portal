import { HttpError } from "../deps.ts";
import { serveOgImage } from "./og_image.ts";
import {
  assertEquals,
  assertRejects,
  connInfo,
  Context,
  createRoute,
} from "../test_deps.ts";

const url =
  "https://example.com/portrait/Hello%20World.png?theme=Light&font-size=100px";
const getRoute = createRoute("GET");
const ctx = new Context(new Request(url), connInfo);

Deno.test("overview", async function () {
  assertEquals(
    (await getRoute({
      pathname: "/portrait/*",
      search: "INVALID=*",
    })(
      serveOgImage,
    )(ctx)).response.ok,
    false,
  );
  assertEquals(
    (await getRoute({
      pathname: "/portrait/*",
      search: "theme=*",
    })(
      serveOgImage,
    )(ctx)).response.ok,
    true,
  );
  await assertRejects(
    async () => {
      await getRoute({
        pathname: "/portrait/*",
        search: "theme=*",
      })(
        serveOgImage,
      )(
        new Context(
          new Request(
            "https://example.com/portrait/Hello%20World.INVALID?theme=Light&font-size=100px",
          ),
          connInfo,
        ),
      );
    },
    HttpError,
    "The file extension of the resource is invalid.",
  );
});
