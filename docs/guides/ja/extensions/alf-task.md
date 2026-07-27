# ALF Task Extension

Version 付き app-provided automation task definition を公開するときに使います。

## Contract

`extension.alfTask.alftask.getTasks` が必須で、registration は 2 段階です。

1. `alfTask:v1` を登録します。
2. Cached app token で `registerAlfTasks` を呼び、task version を sync します。

各 predefined task は stable version、name、trigger、typed memory schema、workflow node、
`startNodeId` を含みます。Node ID と `next` reference が意図した graph を作る必要があり、version
は deployment timestamp ではなく developer-managed change detector です。

## TypeScript

`@Extension({ name: "alfTask", systemVersion: "v1" })` と `GetAlfTasksResponseSchema` を使い、server
が到達可能になってから `NativeFunctionClient.registerAlfTasks()` を呼びます。
[TypeScript ALF task reference](../../../reference/typescript/extensions/alf-task.md) を参照してください。

## Go

```go
err := app.Use(alftask.Extension().GetTasks(handler.GetTasks))
```

Auto-registration 後、deployment または管理された release step で Go native client の ALF task
sync を一度呼びます。Function request ごとには呼びません。

## 信頼性・検証

- Task key を安定させ、behavior が変わると definition version を上げます。
- Retry が side effect を繰り返し得る task execution は idempotent にします。
- Discovery、extension registration、secondary sync、version readback、invalid definition、以前の
  version への rollback を test します。
- Task definition に private workflow data や secret を含めません。

[Go native reference](../../../reference/go/NATIVE.md) も参照してください。
