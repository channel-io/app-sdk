---
"@channel.io/app-sdk-server": patch
---

Defer datasource table authorization and dialect-specific syntax validation to AppStore and the configured database provider while preserving single-statement read-only guards.
