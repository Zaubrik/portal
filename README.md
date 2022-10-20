# portal

Portal is a fast and simple routing framework powered by the
[URLPattern](https://developer.mozilla.org/en-US/docs/Web/API/URL_Pattern_API)
interface for Deno. The `URLPattern` interface matches URLs or parts of URLs
against a pattern. The pattern can contain capturing groups that extract parts
of the matched URL. The best way to learn and test the URL Pattern API is using
our free [URL Pattern User Interface](https://dev.zaubrik.com/urlpattern/).

## Important

Always check the the `groups` properties of the `URLPatternResult` for being
_present_. The implementations vary regarding empty string or `undefined`.

## API

```bash
deno doc https://deno.land/x/portal/mod.ts
```

## Todo

- Add `WebSocket` support when
  [WebSocketStream](https://deno.land/manual/runtime/http_server_apis#websocket-support)
  arrives.
