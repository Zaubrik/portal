import { Portal } from "../portal.ts";
import { serveOgImage } from "./og_image.ts";
import { assertEquals, getResponseTextFromApp } from "../test_deps.ts";

const url = "http://0.0.0.0:8080/Hello%20World.png?theme=Light&font-size=100px";

Deno.test("[og_image] overview", async function () {
  const app = new Portal();
  const getResponseText = getResponseTextFromApp(app);
  app.get(
    { pathname: "/{:text}.png" },
    serveOgImage,
    (ctx) => new Response(ctx.response.ok ? "image" : "no image"),
  );
  assertEquals(
    await getResponseText(new Request(url)),
    "image",
  );
});
