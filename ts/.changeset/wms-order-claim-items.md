---
"@channel.io/app-sdk-core": minor
---

Add optional item-level claims to the WMS order group: `requestCancelOrder`, `requestReturnOrder`, and `requestExchangeOrder` now accept `cancelItems`, `returnItems`, and `exchangeItems` (`{ id, quantity? }[]`, where `id` is an `order.getOrders` `items[].id`). Omitting the items keeps the existing whole-order behavior. Requires App Store schema support before callers send the new fields.
