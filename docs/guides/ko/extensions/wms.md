# WMS 확장

WMS는 warehouse와 order-management provider를 연결할 때 사용합니다. 현재 계약은 ID 기반
`extension.wms.order.*` Function group과 SDK가 export하는 `WmsOrderV2`, `WmsOrderItemV2`,
`WmsDeliveryV2` 타입을 사용합니다.

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

현재 method:

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

`@Extension({ name: "wms", systemVersion: "v1" })`과 공개 WMS schema인
`WmsGetAppConfigs*`, `WmsOrderGetOrders*`, `WmsOrderAction*`, `WmsOrderCancel*`,
`WmsOrderReturn*`, `WmsOrderExchange*`, `WmsOrderGetExchangeableItems*`,
`WmsOrderChangeShippingAddress*`를 사용합니다.
각 Function은 정확한 `extension.wms.order.*` 이름으로 등록합니다.

`order.getOrders`의 주문에는 수령자·배송지 `shippingAddress`(commerce와 같은 `OrderAddress`, 이름을
나누지 못하면 전체 이름을 `lastName`에), 주문일 `orderedAt`(unix ms), 판매처 `shopId`·`shopName`을
담습니다. 품목에는 `option`, 출고 가능 여부 `shippingAvailability`(WMS 원문 문자열, 주문 단위로만 주는
WMS는 같은 값을 품목마다), 입고예정일 `estimatedRestockDate`, `barcode`, WMS 옵션 ID `variantId`를
담습니다. 모두 선택 필드입니다.

`requestCancelOrder`, `requestReturnOrder`는 `cancelItems`, `returnItems`로 부분 처리를 받습니다. 각 품목의 `id`는 `order.getOrders`의
`items[].id`이고 `quantity`를 비우면 그 품목의 전체 수량입니다. 품목 목록을 비우면 `orderIds` 주문의
품목 전부가 대상입니다.

교환은 `requestExchangeOrder`의 `beforeExchangeItems`(돌려받을 품목, 같은 규칙)와
`afterExchangeItems`(대신 보낼 `productId`·`variantId`·`quantity`)로 받습니다. `variantId`는
commerce variant id가 아니라 `getExchangeableItems`가 돌려준 WMS 옵션 ID입니다. 교환 가능한 옵션은
`getExchangeableItems`(`orderId`, 선택 `items`)로 조회하고, 응답의 `exchangeableItems[].id`를
`beforeExchangeItems[].id`로, `variants[].id`를 `afterExchangeItems[].variantId`로 넘깁니다.

## 인증·신뢰성·테스트

- 신뢰할 수 있는 Config context에서 shop 설정을 찾고 모든 request에서 order/shop ownership을
  검증합니다. WAM이 전달한 shop/order ID만 신뢰하지 않습니다.
- 취소·반품·교환 restore와 배송지 변경 전에 provider 상태를 다시 조회합니다.
- 모든 mutation을 idempotent하게 만들고 retry에 필요한 provider request/result mapping을 보존합니다.
- Capability discovery, shop 설정 누락, pagination, duplicate mutation, restore race,
  permission denial, rollback을 테스트합니다.

[TypeScript Extension 레퍼런스](../../../reference/typescript/EXTENSIONS.md)와
[Go Extension 레퍼런스](../../../reference/go/EXTENSIONS.md)를 확인하세요.
