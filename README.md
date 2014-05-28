This is a tool designed to facilitate learning how web servers
and the HTTP protocol work. It's designed as a companion app to
the [URL Demystifier][].

The tool is a simple proxy to [placekitten.com][], but provides
additional information about every incoming request to a particular
`/:width/:height` image via a WebSocket-based logging interface at
`/:width/:height/log`.

## Quick Start

```
npm install
DEBUG= node app.js
```

Then visit http://localhost:3000/.

  [URL Demystifier]: https://github.com/toolness/url-demystifier
  [placekitten.com]: http://placekitten.com/
