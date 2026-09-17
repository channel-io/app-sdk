---
"@channel.io/app-sdk-core": minor
---

Add `sellerProductCode` to `CommerceProduct`, the code a seller assigns to a product by hand.

`productCode` is the code the platform assigns to a product. Sellers who run their own item codes
enter them in a separate field the platform keeps for that purpose — Cafe24 "custom product code",
Imweb "custom product code", Naver Smart Store "seller management code" — and the commerce
contract had nowhere to carry that value, so a workflow that keys on the seller's own code could not
read it from `getProducts`.

The field is deliberately not named `sku` and does not inherit into variants. Platforms that call
the product-level code `sku` (BigCommerce, WooCommerce) let a variant inherit it when the variant's
own code is empty; Cafe24 keeps the two as independent entries, and a product with an empty seller
code can still have every variant coded. `variants[].sku` stays the item-level code and is a separate
value.

The field is optional because some platforms have no product-level seller code at all (Shopify keeps
`sku` on the variant only); an app that cannot supply it leaves it out. It is a standard field rather
than a provider-specific extension because the axis is shared by several platforms — the same
reasoning that put `tags` on `CommerceOrder`.
