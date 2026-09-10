---
"@channel.io/app-sdk-core": minor
---

Add a `product` group to the commerce extension with one function,
`extension.commerce.product.getProducts`, so an app can expose its product catalog through the
same contract surface as orders. Until now the extension only had `core` and `order` groups, and
there was no standard place to list products or look one up by id.

The function is a catalog read, not a search: `searchFilter` accepts `productId` (a single id or
several — in the commerce filter dialect any-of is `$eq` with several `values`), `state`, and
`createdAt`, and an app rejects any key it has not advertised. It does not take a `name` key. `since` and `limit` follow `getOrders`, and the output is `{ products, next }`.

`CommerceProduct` carries `id` (the same value as `items[].productId` on an order), `name`,
`price`, and optional `originalPrice`, `currency`, `state` (`active` / `inactive`, left unset when
unknown), `imageUrl`, `images` (every image, the representative one included), `productUrl`,
`description`, `summary`, `vendor`, `productType`, `categories`, `tags`, `createdAt`, `updatedAt`,
and `variants`. `createdAt` is when the mall created the product; `updatedAt` may be the time the
app stored the product rather than the time the mall changed it. A variant's `id` is the same value
as `items[].variantId` on an order and `afterExchangeItems[].variantId` on an exchange request.

`CommerceProductVariant.price` is the variant's absolute selling price. This is deliberately
different from `CommerceExchangeableVariant.additionalAmount`, which is the surcharge relative to
the original item. `stockQuantity` is left unset when the variant does not track inventory, so `0`
(sold out) stays distinguishable from unknown. `price` fields have presence so a zero price is
emitted, matching the other commerce amount fields — in Go they are `*float64`, so an app sets them
through a pointer.

`state` is a closed set. A mall-specific state such as a draft has to be mapped to one of the two
values by the app, and a TypeScript app validating its output against the schema fails on any other
value.

`CommerceAppCapabilities` gains `getProductsOptions`. It follows the other `*Options`: `optional`
lists the function's input fields (`searchFilter`, `since`, `limit`), and the `searchFilter` keys the
app accepts are advertised as the enum `allowedValues` of `fieldConfigs["searchFilter.key"]`, the
same way `getOrdersOptions` does it. `required` stays empty because calling without a filter returns
the first page of the catalog.
