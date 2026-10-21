# WMS Extension

Use WMS for warehouse and order-management providers. The current contract uses the ID-based
`extension.wms.order.*` Function group and `WmsOrderV2`, `WmsOrderItemV2`, and `WmsDeliveryV2`
types exported by the SDK.

## Go

```go
app := appsdk.New(appsdk.Options{AppID: appID})
err := app.Use(wms.Extension().
  GetAppConfigs(handler.GetAppConfigs).
  OrderGetOrders(handler.OrderGetOrders).
  OrderRequestCancelOrder(handler.OrderRequestCancelOrder).
  OrderRestoreCanceledOrder(handler.OrderRestoreCanceledOrder).
  OrderRequestReturnOrder(handler.OrderRequestReturnOrder).
  OrderRestoreReturnedOrder(handler.OrderRestoreReturnedOrder).
  OrderRequestExchangeOrder(handler.OrderRequestExchangeOrder).
  OrderRestoreExchangedOrder(handler.OrderRestoreExchangedOrder).
  OrderChangeShippingAddress(handler.OrderChangeShippingAddress).
  OrderGetExchangeableItems(handler.OrderGetExchangeableItems),
)
```

Current methods:

- `extension.wms.core.getAppConfigs`
- `extension.wms.order.getOrders`
- `extension.wms.order.requestCancelOrder`
- `extension.wms.order.restoreCanceledOrder`
- `extension.wms.order.requestReturnOrder`
- `extension.wms.order.restoreReturnedOrder`
- `extension.wms.order.requestExchangeOrder`
- `extension.wms.order.restoreExchangedOrder`
- `extension.wms.order.changeShippingAddress`
- `extension.wms.order.getExchangeableItems`

## TypeScript

Use `@Extension({ name: "wms", systemVersion: "v1" })` with the exported WMS schemas:
`WmsGetAppConfigs*`, `WmsOrderGetOrders*`, `WmsOrderAction*`, `WmsOrderCancel*`,
`WmsOrderReturn*`, `WmsOrderExchange*`, `WmsOrderGetExchangeableItems*`, and
`WmsOrderChangeShippingAddress*`. Register each
Function under its exact `extension.wms.order.*` name.

Orders from `order.getOrders` carry the recipient and destination in `shippingAddress` (the same
`OrderAddress` as commerce; put the full name in `lastName` when it cannot be split), the order date
`orderedAt` (unix ms), and the sales channel `shopId`/`shopName`. Items carry `option`, the shipping
availability `shippingAvailability` (the WMS's own string; a WMS that only reports it per order repeats
the value on every item), the restock date `estimatedRestockDate`, `barcode`, and the WMS option id
`variantId`. All of them are optional.

`requestCancelOrder` and `requestReturnOrder` accept partial requests through `cancelItems` and
`returnItems`. Each item `id` is an `items[].id` from
`order.getOrders`; an empty `quantity` means the item's whole quantity. An empty item list targets
every item of the orders in `orderIds`.

`requestExchangeOrder` takes `beforeExchangeItems` (items sent back, same rules) and
`afterExchangeItems` (the `productId`, `variantId`, and `quantity` to send instead). `variantId` is a
WMS option id returned by `getExchangeableItems`, not a commerce variant id. Look up the candidates with
`getExchangeableItems` (`orderId`, optional `items`), then pass `exchangeableItems[].id` as
`beforeExchangeItems[].id` and `variants[].id` as `afterExchangeItems[].variantId`.

## Authentication, reliability, and testing

- Resolve shop configuration from trusted Config context and verify order/shop ownership on every
  request. Never trust a shop or order ID solely because a WAM supplied it.
- Re-read provider state before cancel/return/exchange restore and shipping-address changes.
- Make every mutation idempotent and preserve the provider request/result mapping needed for retry.
- Test capability discovery, missing shop configuration, pagination, duplicate mutation delivery,
  restore races, permission denial, and rollback.

See the [TypeScript Extension reference](../../../reference/typescript/EXTENSIONS.md) and
[Go Extension reference](../../../reference/go/EXTENSIONS.md).
