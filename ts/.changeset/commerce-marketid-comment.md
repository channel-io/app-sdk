---
"@channel.io/app-sdk-core": patch
---

Correct the `CommerceOrder.marketId` doc comment, which claimed the field is empty for own-mall
orders. It is not: Cafe24 fills it for own-mall orders too, using `self`, `cafe24`, `mobile` or
`mobile_d`. A consumer that followed the comment and branched on `marketId` being non-empty would
classify every Cafe24 order as an external-marketplace order.

The comment now says the value identifies the route an order came in through, that a non-empty
value does not imply an external marketplace, and that `marketOrderNo` is the field to check when
external-marketplace membership is what you actually need. `marketOrderNo` in turn now states that
it is empty for own-mall orders.

Comments only — no schema, wire format or type changes.
