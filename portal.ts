// deno-lint-ignore-file no-unreachable no-unsafe-finally
import { ConnInfo, serve, ServeInit, serveTls, ServeTlsInit } from "./deps.ts";

/** The `Context` is accessible inside the `Handlers` as only argument. */
export type Context<S extends State = DefaultState> = {
  state: S;
  url: URL;
  urlPatternResult: URLPatternResult;
  error: Error | null;
  connInfo: ConnInfo;
  request: Request;
  response: Response;
};
/** Receives a `Context` object and returns a `Response` object or `undefined`. */
export type Handlers<S extends State = DefaultState> = ((
  ctx: Context<S>,
) => Promise<Response | void | undefined> | Response | void | undefined)[];
type Method =
  | "ALL"
  | "CONNECT"
  | "DELETE"
  | "GET"
  | "HEAD"
  | "OPTIONS"
  | "PATCH"
  | "POST"
  | "PUT"
  | "TRACE";
type Route<S extends State = DefaultState> = {
  method: Method;
  urlPattern: URLPattern;
  handlers: Handlers<S>;
};
/** Any object can be assigned to the property `state` of the `Context` object. */
export type State = Record<string | number | symbol, unknown>;
// deno-lint-ignore no-explicit-any
type DefaultState = Record<string, any>;
type Params = { [key: string]: string };

/** The default error fallback which invoked inside the `catch` statement first. */
function errorFallback(ctx: Context) {
  if (ctx.error) {
    if (
      ctx.error instanceof URIError ||
      ctx.error instanceof Deno.errors.InvalidData
    ) {
      return new Response("Bad Request", { status: 400 });
    } else if (ctx.error instanceof Deno.errors.NotFound) {
      return new Response("Not Found", { status: 404 });
    } else {
      return new Response("Internal Server Error", { status: 500 });
    }
  } else {
    throw Error("Never!");
  }
}

/** Faciliates routing powered by the `URLPattern` interface. */
export class Portal<S extends State = DefaultState> {
  state: S;
  routes: Route<S>[] = [];
  catchRoutes: Route<S>[] = [];
  finallyRoutes: Route<S>[] = [];
  /**
   * Creates routing functions.
   * ```ts
   * const getAndPost = app.add("GET", "POST");
   * getAndPost({ pathname: "/path/*" }, (ctx) => new Response("Hello"));
   *  ```
   */
  add = this.addRoutes(this.routes);
  addCatch = this.addRoutes(this.catchRoutes);
  addFinally = this.addRoutes(this.finallyRoutes);
  /**
   * Takes a `URLPatternInput` and one or multiple `Handlers`. It applies the
   * `Handlers` to the named HTTP method and the specified route.
   * ```ts
   * app.connect({ pathname: "*" }, (ctx) => new Response("Hello"));
   * ```
   */
  connect = this.add("CONNECT");
  delete = this.add("DELETE");
  get = this.add("GET");
  head = this.add("HEAD");
  options = this.add("OPTIONS");
  patch = this.add("PATCH");
  post = this.add("POST");
  put = this.add("PUT");
  trace = this.add("TRACE");
  connectCatch = this.addCatch("CONNECT");
  deleteCatch = this.addCatch("DELETE");
  getCatch = this.addCatch("GET");
  headCatch = this.addCatch("HEAD");
  optionsCatch = this.addCatch("OPTIONS");
  patchCatch = this.addCatch("PATCH");
  postCatch = this.addCatch("POST");
  putCatch = this.addCatch("PUT");
  traceCatch = this.addCatch("TRACE");
  connectFinally = this.addFinally("CONNECT");
  deleteFinally = this.addFinally("DELETE");
  getFinally = this.addFinally("GET");
  headFinally = this.addFinally("HEAD");
  optionsFinally = this.addFinally("OPTIONS");
  patchFinally = this.addFinally("PATCH");
  postFinally = this.addFinally("POST");
  putFinally = this.addFinally("PUT");
  traceFinally = this.addFinally("TRACE");
  /** Takes a route and `Handlers` and applies those to all HTTP methods. */
  all = this.add("ALL");
  allCatch = this.addCatch("ALL");
  allFinally = this.addFinally("ALL");

  /**
   * Takes a `State` object which will later be assigned to the `Context` and
   * adds the default error fallback to the `catchRoutes`.
   */
  constructor(state: S = {} as S) {
    this.state = state;
    this.catch(errorFallback);
  }

  /**
   * Adds one or multiple `Handlers` (middlewares) to all methods and routes.
   * ```ts
   * app.use((ctx) => {
   *   const start = Date.now();
   *   ctx.state.start = start;
   * });
   * ```
   */
  use(...handlers: Handlers<S>) {
    return this.all({ pathname: "*" }, ...handlers);
  }

  /**
   * The passed `Handlers` will be executed when an exception has been thrown
   * which is not a `Response` object. As a consequence a thrown `Response` can
   * shortcut the execution order directly to the `finally` handlers.
   * ```ts
   * app.catch((ctx) => new Response("Something went wrong", { status: 500 }));
   * ```
   */
  catch(...handlers: Handlers<S>) {
    return this.allCatch({ pathname: "*" }, ...handlers);
  }

  /**
   * The passed `Handlers` will always be executed after all other `Handlers`.
   * ```ts
   * app.finally((ctx) => {
   *   const rt = ctx.response.headers.get("X-Response-Time");
   *   console.log(
   *     `${ctx.request.method} ${ctx.url.pathname} - ${String(rt)}`,
   *   );
   * });
   * ```
   */
  finally(...handlers: Handlers<S>) {
    return this.allFinally({ pathname: "*" }, ...handlers);
  }

  private addRoutes(routes: Route<S>[]) {
    return (...methods: Method[]) =>
      (urlPatternInput: URLPatternInput, ...handlers: Handlers<S>) => {
        methods.forEach((method: Method) =>
          routes.push({
            method,
            handlers,
            urlPattern: new URLPattern(urlPatternInput),
          })
        );
        return this;
      };
  }

  private async invokeHandlers(
    ctx: Context<S>,
    routes: Route<S>[],
  ): Promise<Context<S>> {
    const len = routes.length;
    for (let i = 0; i < len; i++) {
      const r = routes[i];
      if (
        (r.method === "ALL" || r.method === ctx.request.method) &&
        (ctx.urlPatternResult = r.urlPattern.exec(ctx.url)!)
      ) {
        for (const fn of r.handlers) {
          ctx.response = await fn(ctx) ?? ctx.response;
        }
      }
    }
    return ctx;
  }

  private async handleContext(ctx: Context<S>): Promise<Response> {
    try {
      ctx = await this.invokeHandlers(ctx, this.routes);
    } catch (errorOrResponse) {
      if (errorOrResponse instanceof Response) {
        ctx.response = errorOrResponse;
      } else {
        ctx.error = errorOrResponse;
        ctx = await this.invokeHandlers(ctx, this.catchRoutes);
      }
    } finally {
      ctx = await this.invokeHandlers(ctx, this.finallyRoutes);
      return ctx.response;
    }
  }

  private createCtx(request: Request, connInfo: ConnInfo): Context<S> {
    return {
      state: this.state,
      url: new URL(request.url),
      // NOTE: `urlPatternResult` will always be (correctly!) of the type
      // `URLPatternResult` inside of the `Handlers`. See method `invokeHandlers`.
      urlPatternResult: null as unknown as URLPatternResult,
      error: null,
      connInfo,
      request,
      response: new Response("Not Found", { status: 404 }),
    };
  }

  /** Handles the `Request` objects. It is only public for testing purposes.*/
  requestHandler = async (
    request: Request,
    connInfo: ConnInfo,
  ): Promise<Response> =>
    await this.handleContext(this.createCtx(request, connInfo));

  /**
   * Constructs a server, creates a listener on the given address, accepts
   * incoming connections, upgrades them to TLS, and handles requests.
   * ```ts
   * await app.listen({ port: 8080 })
   * ```
   */
  async listen(options: ServeInit | ServeTlsInit) {
    return "certFile" in options || "keyFile" in options
      ? await serveTls(this.requestHandler, options)
      : await serve(this.requestHandler, options);
  }
}
