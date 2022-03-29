import * as Drash from "https://deno.land/x/drash@v2.5.4/mod.ts";

// Create your resource

class HomeResource extends Drash.Resource {
  public paths = ["/"];

  public GET(request: Drash.Request, response: Drash.Response): void {
    return response.text("Hello");
  }
}

// Create and run your server

const server = new Drash.Server({
  hostname: "0.0.0.0",
  port: 1234,
  protocol: "http",
  resources: [HomeResource],
});

server.run();
