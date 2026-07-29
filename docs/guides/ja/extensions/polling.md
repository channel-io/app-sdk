# Polling Extension

AppStore が channel-scoped または manager-scoped task を繰り返し実行するときに使います。AppStore は scheduling と
queueing、アプリは target paging、cursor、provider call、idempotency を担当します。

## Contract

| Function                                | 必須              | 役割                                       |
| --------------------------------------- | ----------------- | ------------------------------------------ |
| `extension.polling.metadata.getPollers` | 必須              | Schedule と target Function を宣言         |
| `extension.polling.target.getChannels`  | 条件付き          | Install 済み channel target を page で返す |
| `extension.polling.target.getManagers`  | 条件付き          | channel/manager target を page で返す      |
| Poller の `functionName`                | Poller ごとに必須 | 制限された polling batch を実行            |

各 poller の `intervalSeconds` は正の値です。`timeoutSeconds` を省略すると 30 秒で、
`maxConcurrency`/`rps` で worker load を制限できます。`executionScope` の default は `channel` で、
manager caller で実行する場合は `manager` を指定します。宣言した scope ごとの resolver が必要です。
両 resolver は Function name、optional cursor、最大 500 の正の limit を受け取ります。
`hasNextPage` が true の場合 `nextCursor` が必須です。

## TypeScript

`@Extension({ name: "polling", systemVersion: "v1" })`、`GetPollersOutputSchema`、
`GetPollingTargetChannelsInputSchema`、`GetPollingTargetChannelsOutputSchema`、または対応する `Managers` schema を使います。Metadata
が指定する poller handler も登録します。[TypeScript Polling reference](../../../reference/typescript/extensions/polling.md)
を参照してください。

## Go

```go
err := app.Use(polling.Extension().
  GetPollers(handler.GetPollers).
  GetChannels(handler.GetChannels).
  GetManagers(handler.GetManagers))
appsdk.MustRegister(app, "example.poll", handler.Poll)
```

## 認証・信頼性

- Cursor は target/provider connection ごとの durable storage に保存します。
- Page size、実行時間、provider concurrency を制限し、commit 済み progress だけを checkpoint します。
- Function context が認可した caller の credential だけを使います。Manager caller は既存の manager OAuth、
  API key、config path を hydrate し、Polling は credential table を直接参照しません。
- Pagination、empty page、duplicate delivery、partial batch failure、rate limit、process restart 後の
  retry を test します。

[Go Extension reference](../../../reference/go/EXTENSIONS.md) も参照してください。
