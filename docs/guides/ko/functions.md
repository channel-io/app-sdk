# Function 등록

Function은 Channel 또는 다른 앱이 앱 서버에 요청하는 typed RPC입니다. 요청의 `method`가 Function의
전체 이름이고 `params`가 입력입니다. 앱 고유 Function은 `orders.get`처럼 standalone으로 등록하고,
표준 Extension Function은 Extension 이름과 relative name으로 전체 이름을 만듭니다.

## Wire contract

수신 요청은 다음 JSON-RPC-like envelope를 사용합니다.

```json
{
  "method": "orders.get",
  "params": { "orderId": "order-1" },
  "context": {
    "caller": { "type": "manager", "id": "manager-id" },
    "channel": { "id": "channel-id" }
  },
  "systemVersion": "v1"
}
```

- `method`: discovery에 공개된 정확한 전체 Function 이름
- `params`: schema로 검증할 입력
- `context`: caller, Channel, language, auth/config처럼 호출 surface가 제공하는 문맥
- `systemVersion`: Extension 계약 version이 필요한 경우 사용

공개 JSON field는 TypeScript와 Go 모두 camelCase를 사용합니다. `context`는 raw body 기반
`x-signature` 검증이 성공한 요청에서만 신뢰하세요.

성공은 `result`, 예상 가능한 실패는 구조화된 `error`를 반환합니다.

```json
{ "result": { "id": "order-1" } }
```

```json
{
  "error": {
    "code": 2,
    "type": "invalidParams",
    "message": "orderId is required"
  }
}
```

대표 code는 처리할 수 없는 입력 `1`, bad request `2`, not found `3`, unauthorized `4`, method not
found `-32601`, internal error `-32603`입니다. `type`은 programmatic handling에 쓸 수 있게 안정적으로
유지하고, error에 credential이나 고객 데이터를 넣지 마세요. 전체 envelope는
[공통 protocol](../../reference/protocol.md)을 기준으로 합니다.

### 추가 입력이 필요한 Function

호출을 완료하려면 사용자의 선택이 더 필요한 경우 성공 결과로
`NeedsUserInputResultSchema`를 반환할 수 있습니다. 한 번의 결과에 필요한 질문을 모두 담고,
다음 호출은 같은 Function에 기존 `continuationToken`과 실제로 받은 답만 전달합니다.

```ts
const CreatorDiscoveryOutputSchema = z.union([
  NeedsUserInputResultSchema,
  CreatorRankingResultSchema,
]);

return {
  type: "needsUserInput",
  requestId: "creatorDiscovery",
  questions: [
    {
      key: "platform",
      label: "플랫폼",
      prompt: "어느 플랫폼을 조회할까요?",
      inputType: "singleSelect",
      required: true,
      options: [
        { value: "youtube", label: "YouTube" },
        { value: "instagram", label: "Instagram" },
      ],
    },
  ],
  continuationToken,
};
```

`continuationToken`은 사용자에게 표시하지 않는 opaque 값입니다. 만료 시간을 두고 앱, Function,
Channel, caller에 바인딩해 서명하세요. 재개 호출도 새 호출과 동일하게 입력 검증, 권한 검증,
실행 정책을 적용해야 합니다. token에 credential이나 원문 고객 데이터를 넣지 마세요.

## 수신 처리와 discovery

Developer portal에는 Function root를 등록하고 AppStore는 system version이 붙은 route를 호출합니다.

```text
Function Endpoint: https://app.example.com/functions
실제 요청:        PUT https://app.example.com/functions/v1
```

SDK가 route, dispatch, schema validation, error envelope와
`extension.core.function.getFunctions` discovery를 처리합니다. Raw JSON-RPC router나 수동 discovery
응답을 만들지 마세요. TypeScript는 `SignatureGuard`와 `rawBody: true`, Go는
`server.WithSignature`로 정확한 request bytes의 HMAC-SHA256 signature를 검증합니다.

## TypeScript

TypeScript 앱은 decorator API와 Zod schema를 사용합니다.

```ts
@Func("orders.get")
@InputSchema(z.object({ orderId: z.string() }))
@OutputSchema(z.object({ id: z.string() }))
async getOrder(@Ctx() ctx: Context, @Input() input: { orderId: string }) {
  return this.service.getOrder(ctx.channel.id, input.orderId);
}
```

`@Extension({ name: "command" })`이 있는 provider에서 `@Func("metadata.getCommands")`를 등록하면
전체 이름은 `extension.command.metadata.getCommands`가 됩니다. Standalone Function provider에는
가짜 `@Extension`을 붙이지 마세요. 모든 decorated class를 NestJS module의 `providers`에 추가해야
discovery됩니다.

## Go

Go는 builder와 generic handler를 사용합니다.

```go
type GetOrderInput struct {
  OrderID string `json:"orderId"`
}

type GetOrderOutput struct {
  ID string `json:"id"`
}

appsdk.MustRegister(
  app,
  "orders.get",
  func(ctx context.Context, fnCtx appsdk.Context, in *GetOrderInput) (*GetOrderOutput, error) {
    return &GetOrderOutput{ID: in.OrderID}, nil
  },
)
```

`appsdk.Register`와 `appsdk.MustRegister`는 Go struct에서 schema를 만들고, 입력이
`Validate() error`를 구현하면 자동으로 호출합니다. 명시적인 계약에는 `appsdk.InputSchema`,
`appsdk.OutputSchema`, proto helper를 사용하세요.

## Native Function과 App Function 호출

Native Function은 반대 방향으로 앱이 Channel 기능을 호출합니다. App token이나 channel token을
`TokenManager`에서 얻고 typed proxy/client를 우선 사용하세요. 지원 목록은 고정된 문서 표가 아니라
현재 SDK의 TypeScript `NativeFunctionTypeMap`과 Go `native.Client` export가 기준입니다.

다른 앱 또는 자신의 등록된 Function을 AppStore를 통해 호출할 때는 SDK의 app-function client를
사용합니다.

```ts
const result = await nativeClient.callAppFunction<Input, Output>(
  targetAppId,
  "orders.get",
  { orderId: "order-1" },
  ctx,
  channelToken.accessToken,
);
```

```go
result, err := client.CallAppFunction(
  ctx,
  channelToken.AccessToken,
  targetAppID,
  "orders.get",
  map[string]any{"orderId": "order-1"},
  fnCtx,
  "",
)
```

Access token이 있다고 business authorization이 생기는 것은 아닙니다. Target app, 설치 Channel,
caller와 요청 대상의 관계를 handler에서 다시 검증하세요. 자세한 내용은
[TypeScript Native Function 레퍼런스](../../reference/typescript/NATIVE.md)와
[Go Native Function 레퍼런스](../../reference/go/NATIVE.md)를 확인하세요.

## Extension builder

표준 Extension은 SDK schema와 Function 이름을 제공하는 전용 helper를 우선 사용합니다. Go에는
`extension/config`, `extension/oauth`, `extension/calendar`, `extension/command`,
`extension/widget`, `extension/customtab`, `extension/hook`, `extension/polling`,
`extension/store`, `extension/messaging`, `extension/alftask`, `extension/wms` 등이 있습니다.
SDK helper가 없는 standalone Function만 generic registration으로 격리하세요.

다음으로 [Command 가이드](extensions/command.md), [WAM 가이드](wam.md),
[Extension 전체 가이드](extensions.md), [프로덕션 준비 가이드](app-development.md)를 확인하세요.
