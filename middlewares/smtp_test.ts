import { configureAndSend, send } from "./smtp.ts";
import { assertEquals } from "../test_deps.ts";

const clientOptions = {
  connection: {
    hostname: "",
    port: 465,
    auth: {
      username: "",
      password: "",
    },
  },
  client: {
    warning: "error" as const,
  },
};

const emails = {
  abc: "jane.doe@example.com",
  def: "joe.smith@example.com",
};

function createSendConfig(id: string, bodyMessage: string) {
  const to = emails[id as keyof typeof emails];
  if (!to) {
    throw new Error("No email address was found.");
  }
  return {
    from: "karin.lenski@example.com",
    to,
    subject: "Hallo",
    content: bodyMessage,
  };
}

Deno.test("overview", function () {
  assertEquals(
    typeof configureAndSend(clientOptions, createSendConfig, {
      isTest: true,
    }),
    "function",
  );
});
