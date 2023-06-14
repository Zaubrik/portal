export function decodeUriComponentSafely(uriComponent: string) {
  return decodeURIComponent(
    uriComponent.replace(/%(?![0-9A-Fa-f]{2})/g, "%25"),
  );
}
