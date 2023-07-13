# portal

Middlewares for [composium](https://github.com/Zaubrik/composium)

## Important

Always check the the `groups` properties of the `URLPatternResult` for being
_present_. The UrlPattern implementations seem to vary regarding empty string or
`undefined`.

## Decoding

Decoding for querystrings might be necessary if they were encoded on the client
side for special characters.
