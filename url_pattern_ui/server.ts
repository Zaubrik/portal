import { Portal, serveStatic } from "../mod.ts";
import { refresh } from "https://deno.land/x/refresh@1.0.0/mod.ts";

const app = new Portal();
const refreshMiddleware = refresh();

app.use((ctx) => {
  const res = refreshMiddleware(ctx.request);
  if (res) throw res;
});
app.get({ pathname: "*" }, serveStatic(new URL("./", import.meta.url)));

await app.listen({ port: 8080 });
