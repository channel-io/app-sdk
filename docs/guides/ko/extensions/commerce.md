# Commerce 확장

Commerce 확장은 커머스 주문 조회·클레임 액션·상품 카탈로그 조회를 helper로 등록합니다. 조회 모델은 `id` 기반 `CommerceOrder`(`CommerceOrderItem` 포함)이며, 액션은 결과를 `ActionResult`로 감쌉니다.

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
  ChangeShippingAddress(handler.ChangeShippingAddress).
  GetProducts(handler.GetProducts),
)
```

지원 method:

- `extension.commerce.core.getAppConfigs`
- `extension.commerce.order.getOrders`
- `extension.commerce.order.requestCancelOrder`
- `extension.commerce.order.requestReturnOrder`
- `extension.commerce.order.acceptReturnOrder`
- `extension.commerce.order.requestExchangeOrder`
- `extension.commerce.order.getExchangeableItems`
- `extension.commerce.order.changeShippingAddress`
- `extension.commerce.product.getProducts`

주소·결제·이행·클레임에는 SDK가 export하는 값 타입을 재사용합니다.

`getProducts`는 검색이 아니라 카탈로그 조회입니다. `searchFilter`는 `productId`(단건·복수 id)·
`state`·`createdAt`을 받습니다. 받는 키는 `getProductsOptions.fieldConfigs["searchFilter.key"]`의
enum `allowedValues`로 광고하고, 그 밖의 키는 거부하며 `name`은 받지 않습니다. `since`에는 이전
응답의 `next`를 넣고, `limit`은 앱이 기본 10·상한 50으로 둡니다.

## TypeScript

`@Extension({ name: "commerce", systemVersion: "v1" })`과
`@channel.io/app-sdk-server`가 export하는 canonical schema를 사용합니다.
`CommerceGetAppConfigsOutputSchema`, `CommerceGetOrdersInputSchema`/
`CommerceGetOrdersOutputSchema`, action input schema, `CommerceResultSchema`, 상품 카탈로그용
`CommerceGetProductsInputSchema`/`CommerceGetProductsOutputSchema`를 사용하고 위 목록의 정확한
relative name으로 Function을 등록합니다.

## 인증·신뢰성·테스트

- Provider credential은 Config 또는 OAuth context에서 읽고 WAM에서 받지 않습니다.
- App/channel token을 사용하기 전에 요청 shop/order를 신뢰할 수 있는 Function context에 연결합니다.
- Mutation 전에 provider order 상태를 다시 조회하고 실행할 수 없으면 명시적인 unsupported 또는
  failed `ActionResult`를 반환합니다.
- 취소·반품·교환·반품 승인·배송지 변경에 idempotency key를 사용합니다.
- Pagination, partial order, 완료된 claim, duplicate mutation, provider timeout, permission denial,
  unsupported capability를 테스트합니다.

[TypeScript Extension 레퍼런스](../../../reference/typescript/EXTENSIONS.md)와
[Go Extension 레퍼런스](../../../reference/go/EXTENSIONS.md)를 확인하세요.
