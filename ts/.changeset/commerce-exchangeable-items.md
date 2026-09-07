---
"@channel.io/app-sdk-core": minor
---

Replace the `getExchangeableItems` output with `exchangeableItems`, which carries the variants an
order item can be exchanged for. The previous `items` only listed which order items were
exchangeable, so there was no way to learn the `variantId` that `requestExchangeOrder`'s
`afterExchangeItems` requires — the exchange flow could not be implemented from the contract alone.
Each variant carries its `additionalAmount`, human-readable `options`, and stock: `stockQuantity` is
left unset when a variant does not track inventory, so `0` (sold out) stays distinguishable from
unlimited, with `useInventory` telling the two apart.

`items` is removed rather than kept alongside: no app implements commerce `getExchangeableItems` in
either production or exp, and no task calls it, so nothing consumes the field today.

`OrderClaimability` gains four reason fields — `nonCancelableReason`, `nonReturnableReason`,
`nonExchangeableReason`, `nonShippingAddressChangeableReason`. The booleans alone cannot explain
_why_ a claim is unavailable, which malls do report and tasks need in order to tell the customer.
Commerce and order extensions share the type, so both `getOrders` outputs carry them.
