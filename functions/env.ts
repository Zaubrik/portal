import { isPresent } from "./deps.ts";

export function assertEnv(env: string[]): string[] {
  const result = env.map((v) => Deno.env.get(v)).filter(isPresent);
  if (result.length !== env.length) {
    throw new Error(
      `Not all environment variables are defined for: ${env.join(", ")}.`,
    );
  } else {
    return result;
  }
}

export function isProduction() {
  return JSON.parse(
    Deno.env.get("IS_PRODUCTION") ?? "false",
  );
}

export function getHomeDirectory() {
  return Deno.env.get("HOME") || Deno.env.get("USERPROFILE");
}
