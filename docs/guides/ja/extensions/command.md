# Command ガイド

Command Extension は user または manager が Channel の desk/front command UI から app 機能を
実行できるようにします。Command metadata が表示と input を定義し、metadata が参照する typed
Function が実際の action を処理します。

## 現在の contract

| Function または field                    | 必須         | 役割                             |
| ---------------------------------------- | ------------ | -------------------------------- |
| `extension.command.metadata.getCommands` | 必須         | Command definition を discovery  |
| `actionFunctionName`                     | Command ごと | 選択された command を実行        |
| `autoCompleteFunctionName`               | 任意         | Parameter suggestion を返す      |
| `paramDefinitions[].autoComplete`        | 任意         | Parameter の suggestion を有効化 |

`commands` は最大30件の definition を返せます。

| Metadata field             | 現在の制約                                          |
| -------------------------- | --------------------------------------------------- |
| `name`                     | 1-30文字、安定した command identifier               |
| `scope`                    | `desk` または `front`                               |
| `buttonName`               | 任意、1-30文字                                      |
| `description`              | 任意、最大100文字                                   |
| `nameDescI18nMap`          | 任意、language ごとの name と description           |
| `actionFunctionName`       | 実行する正確な完全 Function name                    |
| `autoCompleteFunctionName` | 任意、autocomplete の完全 Function name             |
| `systemVersion`            | 任意、target Function の Extension contract version |
| `alfMode`                  | 必須、`disable` または `recommend`                  |
| `alfDescription`           | 任意、最大1500文字                                  |
| `paramDefinitions`         | 任意、最大10個の typed parameter                    |
| `enabledByDefault`         | 任意、install 後の初期表示                          |

Parameter name は1-20文字で、type は `string`、`float`、`int`、`bool` のいずれかです。最大10件の
static choice、localization map、autocomplete を宣言できます。正確な field は SDK の
`CommandConfigSchema` と `CommandParamDefinitionSchema` が基準です。

## TypeScript

### 登録と discovery

TypeScript では `@Extension({ name: "command", systemVersion: "v1" })` の
`metadata.getCommands` Function を実装します。

```ts
@Extension({ name: "command", systemVersion: "v1" })
export class CommandExtension {
  @Func("metadata.getCommands")
  @InputSchema(z.object({}))
  @OutputSchema(GetCommandsOutputSchema)
  getCommands() {
    return {
      commands: [
        {
          name: "orders",
          scope: "desk",
          description: "Open an order",
          actionFunctionName: "commands.orders.open",
          alfMode: "disable",
          enabledByDefault: true,
          paramDefinitions: [
            { name: "orderId", type: "string", required: true },
          ],
        },
      ],
    };
  }
}
```

SDK auto-registration は app token で `command:v1` Extension を登録し、その後 AppStore が
metadata と Function schema を discovery します。App code から別の command registration payload
を Native Function へ直接送らないでください。Registration success と metadata/action の動作は
別なので、両方を test します。

## Action Function

`actionFunctionName` は command の `name` ではなく、呼び出す完全 Function name です。Surface に
よって action input には次の値が入ります。

- `chat`: `groupChat`、`userChat`、`directChat` などの chat type と ID
- `input`: parameter name を key にした validated map
- `trigger`: command を開いた trigger 情報
- `language`: 現在の user language

Caller と Channel identity は Function `context` にあり、raw body signature 検証後だけ信頼します。
Metadata、action input、context は別の object です。

Action は text/operation result を返すか、WAM を開けます。

```json
{
  "type": "wam",
  "attributes": {
    "appId": "public-app-id",
    "name": "order",
    "wamArgs": { "orderId": "order-1" }
  }
}
```

`wamArgs` には公開可能な最小 identifier だけを入れ、business authorization は WAM が呼ぶ server
Function で再確認してください。実装は [WAM ガイド](../wam.md)に従います。

## Autocomplete

Autocomplete parameter に `autoComplete: true` を設定し、command metadata に
`autoCompleteFunctionName` を指定します。Suggestion Function input は現在の入力状態を渡します。

```json
{
  "chat": { "type": "groupChat", "id": "group-id" },
  "input": [{ "name": "orderId", "value": "ord", "focused": true }],
  "language": "ja"
}
```

一度に1つの argument だけが `focused: true` です。現在の parameter type と一致する choice を返します。

```json
{
  "choices": [{ "name": "Order 1001", "value": "order-1001" }]
}
```

Suggestion は素早く返し、provider search には timeout と result limit を設定してください。他の
入力済み parameter を filter に使えますが、secret や customer raw content を log に残しません。

## Go

Go command builder は metadata、action、suggestion Function をまとめて登録します。

```go
err := app.Use(command.Extension().
  GetCommands(handler.GetCommands).
  Suggestions("commands.orders.suggest", handler.Suggest).
  Execute("commands.orders.open", handler.Open))
```

`command.Config`、`command.ExecuteRequest`、`command.ActionResult` と SDK DTO を使用し、wire field を
local struct で作り直さないでください。

## 検証 checklist

- `actionFunctionName` と `autoCompleteFunctionName` が discovery の完全 name と一致します。
- Metadata は `GetCommandsOutputSchema` または Go command DTO で検証されます。
- Action は正常 input、missing parameter、wrong type、permission denial を処理します。
- Autocomplete は focus、empty query、provider timeout、empty result を処理します。
- WAM action は secret のない最小 `wamArgs` だけを返します。
- Mutation action は idempotent にし、duplicate submission を防ぎます。

[Function 登録](../functions.md)、[WAM ガイド](../wam.md)、
[TypeScript Command reference](../../../reference/typescript/extensions/command.md)、
[Go Extension reference](../../../reference/go/EXTENSIONS.md)を確認してください。
