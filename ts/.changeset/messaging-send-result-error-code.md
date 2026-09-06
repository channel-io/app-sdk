---
"@channel.io/app-sdk-core": minor
---

Add the optional numeric `errorCode` field to `MessagingSendResult` so messaging apps can return a
stable failure reason from `onMediumMessageCreated`. The runtime can persist the code on the failed
Channel message and pass it to `getMediumMessageErrorReason` for a safe user-facing explanation.
