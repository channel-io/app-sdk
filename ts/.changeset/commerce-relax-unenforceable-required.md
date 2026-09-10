---
"@channel.io/app-sdk-core": minor
---

Relax five output fields in the commerce (and legacy order) contract that the SDK could not
guarantee: `Claim.createdAt`, `CommerceOrderItem.claimability`, and `Payment`'s `shippingAmount`,
`discountAmount` and `requireRefundBankAccount`.

Each was declared required while a mall could legitimately have nothing to put there.
`Claim.createdAt` is a presence-less `double`, so an unset value is indistinguishable from `0` and
serialization drops the key. `claimability` is a proto3 message field with implicit presence, so an
app that never computes it emits no key at all — the same reason the four booleans inside it stopped
being required, one level up. The three payment fields carry presence, so `0`/`false` still
serialize; they are relaxed because not every mall separates shipping and discount, or has a refund
bank account concept. `totalAmount` and `itemsAmount` stay required.

Only the canonical schema's `required` lists change; generated field types are unaffected, so no
builder or accessor code needs updating. Consumers reading any of these five should treat them as
possibly absent.
