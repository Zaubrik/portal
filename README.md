# portal

Middlewares for [composium](https://github.com/Zaubrik/composium)

## Important

Always check the the `groups` properties of the `URLPatternResult` for being
_present_. The UrlPattern implementations seem to vary regarding empty string or
`undefined`.

## API

```bash
deno doc https://deno.land/x/portal/mod.ts
```

## Decoding

Decoding for querystrings might be necessary if they were encoded on the client
side for special characters.
