---
"@channel.io/app-sdk-core": minor
"@channel.io/app-sdk-server": minor
---

Restore typed `patchMessage` support for channel-scoped tokens, including `mediumSyncState` and `errorCode`. The app must request the `patchMessage` permission and obtain a token with that grant before calling it. Field masks use the Protobuf JSON comma-separated string format.
