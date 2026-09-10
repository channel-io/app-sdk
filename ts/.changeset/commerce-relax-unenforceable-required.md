---
"@channel.io/app-sdk-core": minor
---

Relax six output fields in the commerce (and legacy order) contract that the SDK could not
guarantee: `Claim.createdAt`, `CommerceOrderItem.claimability`, and `Payment`'s `itemsAmount`,
`shippingAmount`, `discountAmount` and `requireRefundBankAccount`.

Each was declared required while a mall could legitimately have nothing to put there.
`Claim.createdAt` is a presence-less `double`, so an unset value is indistinguishable from `0` and
serialization drops the key. `claimability` is a proto3 message field with implicit presence, so an
app that never computes it emits no key at all — the same reason the four booleans inside it stopped
being required, one level up. The payment fields carry presence, so `0`/`false` still serialize;
they are relaxed because they are the breakdown of the total, and not every mall separates item
subtotal, shipping and discount, or has a refund bank account concept. `totalAmount` — which every
mall reports — stays required, alongside `state` and `currency`.

Only the canonical schema's `required` lists change; generated field types are unaffected, so no
builder or accessor code needs updating. Consumers reading any of these six should treat them as
possibly absent.
