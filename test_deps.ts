import { Portal, State } from "./portal.ts";

export { assertEquals } from "https://deno.land/std@0.142.0/testing/asserts.ts";
export { delay } from "https://deno.land/std@0.142.0/async/delay.ts";
export {
  create,
  getNumericDate,
  verify,
} from "https://deno.land/x/djwt@v2.4/mod.ts";

export type { Header, Payload } from "https://deno.land/x/djwt@v2.4/mod.ts";

export const connInfo = {
  localAddr: { transport: "tcp" as const, hostname: "127.0.0.1", port: 8080 },
  remoteAddr: { transport: "tcp" as const, hostname: "127.0.0.1", port: 48951 },
};

export function getResponseTextFromApp<T extends State>(app: Portal<T>) {
  return async (request: Request) => {
    const response = await app.handleRequest(request, connInfo);
    const responseText = await response.text();
    return responseText;
  };
}
