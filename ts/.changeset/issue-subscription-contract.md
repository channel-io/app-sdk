---
"@channel.io/app-sdk-core": minor
"@channel.io/app-sdk-server": patch
---

Add optional Issue subscription start/stop schemas and interfaces, plus trusted subscription context. These contracts require the corresponding App Store authorization and routing implementation before activation.

Normalize invalid subscription inputs to the shared Issue invalidInput error contract.
