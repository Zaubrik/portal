export function getJwtFromBearer(headers: Headers): string {
  const authHeader = headers.get("Authorization");
  if (authHeader === null) {
    throw new Error("No 'Authorization' header.");
  } else if (!authHeader.startsWith("Bearer ") || authHeader.length <= 7) {
    throw new Error("Invalid 'Authorization' header.");
  } else {
    return authHeader.slice(7);
  }
}
