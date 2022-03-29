import { opine } from "https://deno.land/x/opine@2.1.3/mod.ts";

const app = opine();

app.get("/", function (req, res) {
  res.send("Hello World");
});

app.listen(
  3000,
  () => console.log("server has started on http://localhost:3000 🚀"),
);
