# Commerce 拡張

Commerce 拡張は、コマース注文の取得とクレームアクションを helper で登録します。取得モデルは `id` ベースの `CommerceOrder`（`CommerceOrderItem` を含む）で、アクションは結果を `ActionResult` でラップします。

## Go

```go
app := appsdk.New(appsdk.Options{AppID: appID})
err := app.Use(commerce.Extension().
  GetAppConfigs(handler.GetAppConfigs).
  GetOrders(handler.GetOrders).
  RequestCancelOrder(handler.RequestCancelOrder).
  RequestReturnOrder(handler.RequestReturnOrder).
  AcceptReturnOrder(handler.AcceptReturnOrder).
  RequestExchangeOrder(handler.RequestExchangeOrder).
  GetExchangeableItems(handler.GetExchangeableItems).
  ChangeShippingAddress(handler.ChangeShippingAddress),
)
```

対応 method:

- `extension.commerce.core.getAppConfigs`
- `extension.commerce.order.getOrders`
- `extension.commerce.order.requestCancelOrder`
- `extension.commerce.order.requestReturnOrder`
- `extension.commerce.order.acceptReturnOrder`
- `extension.commerce.order.requestExchangeOrder`
- `extension.commerce.order.getExchangeableItems`
- `extension.commerce.order.changeShippingAddress`

住所・決済・履行・クレームには SDK が export する値型を再利用します。

## TypeScript

`@Extension({ name: "commerce", systemVersion: "v1" })` と
`@channel.io/app-sdk-server` が export する canonical schema を使います。
`CommerceGetAppConfigsOutputSchema`、`CommerceGetOrdersInputSchema`/
`CommerceGetOrdersOutputSchema`、action input schema、`CommerceResultSchema` を使い、上の正確な
relative name で Function を登録します。

## 認証・信頼性・test

- Provider credential は Config/OAuth context から読み、WAM から受け取りません。
- App/channel token を使う前に、request の shop/order を信頼済み Function context に結びます。
- Mutation 前に provider order state を再取得し、実行不能なら明確な unsupported/failed
  `ActionResult` を返します。
- Cancel、return、exchange、return acceptance、shipping-address change に idempotency key を使います。
- Pagination、partial order、完了済み claim、duplicate mutation、provider timeout、permission denial、
  unsupported capability を test します。

[TypeScript Extension reference](../../../reference/typescript/EXTENSIONS.md) と
[Go Extension reference](../../../reference/go/EXTENSIONS.md) を参照してください。
