import { Portal, serveStatic } from "../mod.ts";

const app = new Portal();

app.get({ pathname: "*" }, serveStatic(new URL("./", import.meta.url)));

await app.listen({ port: 8080 });
