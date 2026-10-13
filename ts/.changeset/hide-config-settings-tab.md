---
"@channel.io/app-sdk-core": minor
---

Add the optional Config `hideSettingsTab` metadata flag. Requires App Store support and Config re-registration; stored values and readiness remain unchanged.

Preserve the existing `readOnly` Config field contract in Go/TypeScript schemas so app-owned required values survive SDK serialization and validation.
