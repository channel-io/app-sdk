---
"@channel.io/app-sdk-core": minor
"@channel.io/app-sdk-server": minor
---

Support `webhook.bodyDelivery: "reference"` on `webhook.received` hooks. AppStore then sends a stored large body as `request.bodyRef` (validate it with `WebhookBodyRefSchema`), and apps read the body with the new `NativeFunctionClient.getWebhookBody()` native function. Hooks that omit the field keep receiving `request.body` and `request.rawBodyBase64`.
