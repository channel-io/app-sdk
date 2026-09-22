---
"@channel.io/app-sdk-core": minor
---

Add optional `allowChannelFallback` to OAuth configuration so caller-scoped apps can disable channel credential fallback for unconnected managers. Omission preserves the existing enabled behavior; requires App Store support and OAuth extension re-registration.
