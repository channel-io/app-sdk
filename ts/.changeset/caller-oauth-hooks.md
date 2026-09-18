---
"@channel.io/app-sdk-core": minor
---

Allow OAuth authorization and connection lifecycle hooks to declare an optional `authScope` of `channel` or `manager`. A matching scoped hook takes precedence over the shared hook of the same type; omitting the field preserves existing shared registration behavior. Reject duplicate OAuth hook type/scope registrations. Requires platform support for scoped OAuth hooks.
