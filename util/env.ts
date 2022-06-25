export function assertEnv(env: string[]): string[] {
  const result = env.map((v) => Deno.env.get(v)).filter(isPresent);
  if (result.length !== env.length) {
    throw new Error("Not all environment variables are defined.");
  } else {
    return result;
  }
}
