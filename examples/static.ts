import { Portal, serveStatic } from "../mod.ts";

const app = new Portal({ start: 0 });
app.get(
  { pathname: "*" },
  serveStatic(new URL("./static", import.meta.url)),
);

await app.listen({ port: 8080 });
