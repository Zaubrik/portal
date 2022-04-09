import { ConnectConfigWithAuthentication, send, SendConfig } from "./smtp.ts";
import { assertEquals } from "../test_deps.ts";

const connectConfig: ConnectConfigWithAuthentication = {
  hostname: "",
  port: 465,
  username: "",
  password: "",
};

const sendConfig: SendConfig = {
  from: "",
  to: "",
  subject: "",
};

const emailAddresses = {
  abc: "jane.doe@example.com",
  def: "joe.smith@example.com",
};

function getSendConfig(id: string) {
  const to = emailAddresses[id as keyof typeof emailAddresses];
  if (!to) {
    throw new Error("No email address was found.");
  }
  return { ...sendConfig, to };
}

Deno.test("[smtp] overview", function () {
  assertEquals(
    typeof send(connectConfig, { cb: getSendConfig, idGroup: "id" }, {
      headers: new Headers({
        "Access-Control-Allow-Origin": "*",
      }),
    }),
    "function",
  );
});
