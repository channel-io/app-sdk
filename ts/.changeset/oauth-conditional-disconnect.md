---
"@channel.io/app-sdk-core": patch
"@channel.io/app-sdk-server": patch
---

Add typed OAuth connection identity reads and conditional manager disconnect calls. App callers require explicit own-app permissions and both manager and channel authorization revisions. Existing WAM self-disconnect and lifecycle payloads remain compatible.
