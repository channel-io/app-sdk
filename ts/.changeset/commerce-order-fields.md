---
"@channel.io/app-sdk-core": minor
---

Widen the commerce order contract with fields malls already return but the contract could not
carry — `payment.taxAmount`, item `sku`/`taxLines`/`unfulfilledQuantity`/`requiresShipping`/selling
plan, and order `adminUrl`/`note`/display statuses/`billingAddress`/`shippingLines`/`transactions`/
`metafields`/`customAttributes`. `OrderTransaction` exists so cash-on-delivery and deferred payment
can be told apart, which `payment.methods` alone cannot express.

`OrderClaimability`'s four booleans now carry explicit presence. A proto3 plain bool cannot tell
`false` from unset, so JSON serialization dropped every `false` and an item that allowed no claim
at all was emitted as `claimability: {}`, contradicting the schema that advertises those fields as
required. Generated field types change from `bool` to an optional boolean, so code that builds
`OrderClaimability` through struct literals needs updating; accessors are unchanged.
