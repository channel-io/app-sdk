---
"@channel.io/app-sdk-server": patch
---

Keep the token exchange timeout active until the response body is consumed, so stalled success and error bodies are aborted during token issuance and refresh.
