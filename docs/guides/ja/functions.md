# Function 登録

Function は Channel または他の app が app server に送る typed RPC です。Request の `method` が
Function の完全な name で、`params` が input です。App 固有 Function は `orders.get` のような
standalone name で登録し、標準 Extension Function は Extension name と relative name を組み合わせます。

## Wire contract

受信 call は次の JSON-RPC-like envelope を使用します。

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

- `method`: discovery が公開する正確な完全 Function name
- `params`: schema で検証する untrusted input
- `context`: surface に応じた caller、Channel、language、auth、config data
- `systemVersion`: 必要な場合に Extension contract version を選択

Public JSON field は TypeScript と Go の両方で camelCase を使用します。Raw body の
`x-signature` 検証に成功した後だけ `context` を信頼してください。

成功時は `result`、想定可能な失敗時は structured `error` を返します。

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

主な code は unprocessable input `1`、bad request `2`、not found `3`、unauthorized `4`、method
not found `-32601`、internal error `-32603` です。Programmatic handling 用の `type` は安定させ、
error に credential や customer data を入れないでください。完全な envelope は
[共通 protocol](../../reference/protocol.md)を基準にします。

### 追加のユーザー入力が必要な Function

呼び出しを完了するために追加の選択が必要な場合は、成功結果として
`NeedsUserInputResultSchema` を返せます。現在必要な質問を一つの結果にまとめ、次の呼び出しでは
同じ Function に元の `continuationToken` と実際に受け取った回答だけを渡します。

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
      label: "プラットフォーム",
      prompt: "どのプラットフォームを検索しますか？",
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

`continuationToken` はユーザーに表示しない opaque な値です。有効期限を設定し、app、Function、
Channel、caller に結び付けて署名してください。再開された呼び出しにも通常の入力検証、権限検証、
実行ポリシーを適用し、credential や生の顧客データを token に保存しないでください。

## 受信処理と discovery

Developer portal には Function root を登録し、AppStore は system version 付き route を呼び出します。

```text
Function Endpoint: https://app.example.com/functions
実際の request:   PUT https://app.example.com/functions/v1
```

SDK が routing、dispatch、schema validation、error envelope、
`extension.core.function.getFunctions` discovery を処理します。Raw JSON-RPC router や manual
discovery response を別に作らないでください。TypeScript は `SignatureGuard` と `rawBody: true`、
Go は `server.WithSignature` で正確な request bytes を検証します。

## TypeScript

Decorator API と Zod schema を使用します。

```ts
@Func("orders.get")
@InputSchema(z.object({ orderId: z.string() }))
@OutputSchema(z.object({ id: z.string() }))
async getOrder(@Ctx() ctx: Context, @Input() input: { orderId: string }) {
  return this.service.getOrder(ctx.channel.id, input.orderId);
}
```

`@Extension({ name: "command" })` がある provider の `@Func("metadata.getCommands")` は
`extension.command.metadata.getCommands` になります。Standalone Function のために fake
Extension を作らないでください。Discovery されるよう、decorated class を NestJS module の
`providers` に追加します。

## Go

Go は builder と generic handler を使用します。

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

`appsdk.Register` と `appsdk.MustRegister` は Go struct から schema を作り、input が
`Validate() error` を実装する場合は自動で呼び出します。明示的な contract には
`appsdk.InputSchema`、`appsdk.OutputSchema`、proto helper を使用します。

## Native Function と App Function の呼び出し

Native Function は逆方向で、app が Channel operation を要求します。`TokenManager` から app token
または channel token を取得し、typed proxy/client を優先してください。固定された document の
一覧ではなく、現在の TypeScript `NativeFunctionTypeMap` と Go `native.Client` export が基準です。

他の app または自分の登録済み Function を AppStore 経由で呼ぶ場合は SDK の app-function
client を使用します。

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

有効な access token は business authorization の代わりではありません。Target app、install 済み
Channel、caller、requested resource の関係を handler で再確認してください。正確な API は
[TypeScript Native Function reference](../../reference/typescript/NATIVE.md)と
[Go Native Function reference](../../reference/go/NATIVE.md)を確認します。

## Extension builder

SDK schema と Function name を提供する標準 Extension helper を優先します。Go builder package
には `extension/config`、`extension/oauth`、`extension/calendar`、`extension/command`、
`extension/widget`、`extension/customtab`、`extension/hook`、`extension/polling`、
`extension/store`、`extension/messaging`、`extension/alftask`、`extension/wms` などがあります。
SDK helper がない standalone Function だけを generic registration に分離してください。

次に [Command ガイド](extensions/command.md)、[WAM ガイド](wam.md)、
[Extension 完全ガイド](extensions.md)、[本番運用準備ガイド](app-development.md)を確認してください。
