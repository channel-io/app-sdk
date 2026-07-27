# WMS 拡張

WMS は warehouse/order-management provider を接続するときに使います。現在の contract は
ID-based `extension.wms.order.*` Function group と SDK が export する `WmsOrderV2`、
`WmsOrderItemV2`、`WmsDeliveryV2` type を使います。

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
  OrderChangeShippingAddress(handler.OrderChangeShippingAddress),
)
```

現在の method:

- `extension.wms.core.getAppConfigs`
- `extension.wms.order.getOrders`
- `extension.wms.order.requestCancelOrder`
- `extension.wms.order.restoreCanceledOrder`
- `extension.wms.order.requestReturnOrder`
- `extension.wms.order.restoreReturnedOrder`
- `extension.wms.order.requestExchangeOrder`
- `extension.wms.order.restoreExchangedOrder`
- `extension.wms.order.changeShippingAddress`

## TypeScript

`@Extension({ name: "wms", systemVersion: "v1" })` と公開 WMS schema の
`WmsGetAppConfigs*`、`WmsOrderGetOrders*`、`WmsOrderAction*`、
`WmsOrderChangeShippingAddress*` を使います。各 Function は正確な
`extension.wms.order.*` name で登録します。

## 認証・信頼性・test

- 信頼済み Config context から shop configuration を解決し、request ごとに order/shop ownership
  を検証します。WAM が渡した shop/order ID だけを信用しません。
- Cancel/return/exchange restore と shipping-address change 前に provider state を再取得します。
- 全 mutation を idempotent にし、retry に必要な provider request/result mapping を保存します。
- Capability discovery、shop config 不足、pagination、duplicate mutation、restore race、
  permission denial、rollback を test します。

[TypeScript Extension reference](../../../reference/typescript/EXTENSIONS.md) と
[Go Extension reference](../../../reference/go/EXTENSIONS.md) を参照してください。
