---
"@channel.io/app-sdk-core": minor
---

WMS order group: `extension.wms.order.getOrders` orders now carry optional `shippingAddress` (`OrderAddress`, same as commerce), `orderedAt` (unix ms), `shopId`, and `shopName`. Order items carry optional `option`, `shippingAvailability` (free-form string), `estimatedRestockDate`, `variantId` (WMS option id, not the commerce variant id), and `barcode`. Required fields are unchanged.
