---
"@channel.io/app-sdk-core": minor
---

WMS order group: `requestExchangeOrder` now takes `beforeExchangeItems` (order items sent back) and `afterExchangeItems` (`productId`, `variantId`, `quantity` to send instead), replacing `exchangeItems` from 0.34.0. Adds the optional `extension.wms.order.getExchangeableItems` function, whose `variants[].id` is the WMS option id to pass as `afterExchangeItems[].variantId`, and the `getExchangeableItemsOptions` app capability. `exchangeItems` had no callers; requests that send only `orderIds` are unchanged.
