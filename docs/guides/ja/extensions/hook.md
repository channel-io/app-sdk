# Hook Extension

App、command、config、widget lifecycle event または public webhook event を受け取るときに使います。
Hook metadata が参照する handler は standalone app Function で、新しい Extension Function では
ありません。

## Contract

`extension.hook.metadata.getHooks` が必須です。対応 type は `app.installed`、`app.uninstalled`、
`command.toggle`、`config.saved`、`config.deleted`、`widget.installed`、`widget.uninstalled`、
`webhook.received` です。

Widget hook には widget name と一致する `targetId` が必要です。App、command、Config hook には
target を設定しません。Public webhook target は 1-64 文字の URL-safe identifier です。
`executionScope` の default は `app` で、32-128 文字の高 entropy `endpointToken` が必要です。
Manager scope では AppStore が installation、Channel、manager に binding した URL を発行するため、
token は指定しません。他の hook type に webhook object は使えません。

## TypeScript

`@Extension({ name: "hook", systemVersion: "v1" })` と `GetHooksOutputSchema` を使い、参照される
handler は standalone `@Func` で登録します。Public webhook rule と payload は
[TypeScript Hook reference](../../../reference/typescript/extensions/hook.md) を参照してください。
Manager scope では manager の connect Function で `context.webhooks[targetId].url` を読み、provider
に登録します。Hook definition 自体は app-level のままです。

## Go

```go
err := app.Use(hook.Extension().GetHooks(handler.GetHooks))
appsdk.MustRegister(app, "example.hook.receive", handler.Receive)
```

## 認証・信頼性

- 通常の Function request は raw body ベースの `x-signature` contract で検証します。
- App-scoped `webhook.received` には public stable `targetId`、高 entropy endpoint token、provider
  payload validation、replay protection、token rotation を適用します。
- Manager scope では signature 検証済み Function context の manager と Channel だけを信頼します。
  Provider payload、header、query parameter で execution identity を選択しません。
- 遅い処理は durable queue に渡して速く応答します。Delivery ID を deduplicate し、install、
  delete、provider event handler を idempotent にします。
- Malformed payload、replay、partial failure、retry、uninstall 時の binding revoke、app-level call
  の Channel context 不足、manager call の binding context を test します。

[Go Extension reference](../../../reference/go/EXTENSIONS.md) も参照してください。
