export function isResponse(input: unknown): input is Response {
  return input instanceof Response;
}

export function isUrl(input: unknown): input is URL {
  return input instanceof URL;
}

export function isString(input: unknown): input is string {
  return typeof input === "string";
}

export function isObjectWide(obj: unknown): obj is Record<string, unknown> {
  return (
    obj !== null && typeof obj === "object" && Array.isArray(obj) === false
  );
}
