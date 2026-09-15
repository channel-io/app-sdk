---
"@channel.io/app-sdk-core": minor
---

Add `tags` to `CommerceOrder`, the tags a mall puts on an order itself.

The commerce extension had nowhere to carry them. The legacy `extension.order.core.getOrders`
passed the data-warehouse response straight through, so order tags reached ALF workflows that
branched on them; the commerce contract picks fields one by one, so moving to it silently dropped
the value. Workflows keyed on an order tag could not be published at all, because the legacy
function is hidden once an app serves the commerce one.

Order tags and product tags are different fields and both exist now: `CommerceOrder.tags` is set on
the order, `CommerceProduct.tags` on the product. A consumer that wants to branch on "this order is
flagged VIP" reads the former; one that wants "this order contains a made-to-order item" joins
`items[].productId` against `products[].extId` and reads the latter.

The field is optional and repeated, so an app that cannot supply tags leaves it out and an order
with no tags emits nothing rather than an empty list. Malls that model order tags can fill it
without further contract work — this is not Shopify-specific.
