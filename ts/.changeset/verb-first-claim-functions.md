---
"@channel.io/app-sdk-core": minor
---

Rename commerce and WMS claim functions to verb-first names.

`extension.commerce.order.cancelRequestOrder`, `returnRequestOrder`, `returnAcceptOrder`, and
`exchangeRequestOrder` become `requestCancelOrder`, `requestReturnOrder`, `acceptReturnOrder`, and
`requestExchangeOrder`. The WMS order group follows the same rule, and its restore functions become
`restoreCanceledOrder`, `restoreReturnedOrder`, and `restoreExchangedOrder`.

The matching `getAppConfigs` capability fields are renamed the same way (for example
`cancelRequestOrderOptions` becomes `requestCancelOrderOptions`), and the
`CommerceReturnAcceptOrderInput` proto message becomes `CommerceAcceptReturnOrderInput`. Proto field
numbers are unchanged, so binary payloads stay compatible; JSON keys and generated type names change.

This is a breaking rename. Apps must update their registered function names to match the extension
definitions in the app store, otherwise function discovery will not resolve them.
