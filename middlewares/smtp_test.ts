import { send } from "./smtp.ts";
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
};

const sendConfig = {
  from: "",
  to: "",
  subject: "",
};

const emailAddresses = {
  abc: "jane.doe@example.com",
  def: "joe.smith@example.com",
};

function getSendConfig(id: string, data: Record<string, unknown>) {
  const to = emailAddresses[id as keyof typeof emailAddresses];
  if (!to) {
    throw new Error("No email address was found.");
  }
  return { ...sendConfig, content: JSON.stringify({ ...data, id }) };
}

Deno.test("overview", function () {
  assertEquals(
    typeof send(clientOptions, { cb: getSendConfig, idGroup: "id" }, {
      isDryRun: true,
    }),
    "function",
  );
});
