import {
  Application,
  Router as OakRouter,
} from "https://deno.land/x/oak@v10.5.1/mod.ts";

const app = new Application();
const oakrouter = new OakRouter();
oakrouter.get("/", (context) => {
  context.response.body = "Hello";
});
app.use(oakrouter.routes());

app.listen({ port: 1234 });
