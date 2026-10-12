---
"@channel.io/app-sdk-server": minor
---

Native Function debug logs now omit request and result payloads by default. Explicitly select `payloadLogging: "sanitized"` to log payloads with known sensitive keys redacted; arbitrary content is not redacted. API results and errors are unchanged.
