---
"@channel.io/app-sdk-core": patch
---

Extend OAuth additionalParams values to accept common strings or channel/manager objects, and preserve standard authorizationRequest formatting and S256 PKCE metadata. Existing string declarations and Proto field 10 remain compatible; the Go OAuth builder projects an additive scoped field to the same metadata JSON. Readers of arbitrary TypeScript values must narrow the new union. Requires matching platform support and metadata re-registration, which also activates formerly ignored common string defaults.
