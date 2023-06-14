/**
 * Difference between cloning and copying of a `Response`:
 * https://community.cloudflare.com/t/whats-the-point-of-response-clone/216456
 */
export function copyResponse(response: Response) {
  return new Response(response.body, response);
}
