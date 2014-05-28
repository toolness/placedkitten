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

## Environment Variables

**Note:** When an environment variable is described as representing a
boolean value, if the variable exists with *any* value (even the empty
string), the boolean is true; otherwise, it's false.

* `DEBUG` is a boolean value that indicates whether debugging is enabled.

* `OMIT_HEADERS` is a comma-separated list of request headers to
  exclude when displaying request information to end-users. Typically,
  this should be any headers added by a reverse proxy, such as
  `X-Forwarded-Port`.

<!-- Links -->

  [URL Demystifier]: https://github.com/toolness/url-demystifier
  [placekitten.com]: http://placekitten.com/
