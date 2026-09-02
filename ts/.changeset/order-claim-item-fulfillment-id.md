---
"@channel.io/app-sdk-core": patch
---

Add `fulfillmentId` to `OrderClaimItem`. A single line item can be shipped across several
fulfillments, so returning one requires naming the fulfillment alongside the item. The field is
optional and only meaningful for returns; cancel and exchange inputs may leave it unset.
