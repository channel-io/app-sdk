# Custom Tab Extension

Command や Widget より広く、長く維持される app-owned Desk surface が必要な場合に使います。

## Contract

| Function                                     | 必須           | 役割                           |
| -------------------------------------------- | -------------- | ------------------------------ |
| `extension.customtab.metadata.getCustomTabs` | 必須           | 安定した tab definition を公開 |
| Metadata の `actionFunctionName`             | Tab ごとに必須 | Tab WAM を開く、または準備する |

Tab key は release 間で安定させます。Key と Function name は翻訳せず、表示文言だけを翻訳します。

Tab は最大 5 件です。Name は 1-30 文字の ASCII letter、`_`、`-` のみで、各 definition は action
Function、optional system version、optional locale-to-name map を含みます。

## TypeScript

Metadata には `@Extension({ name: "customtab", systemVersion: "v1" })`、action には standalone
Function を使います。`GetCustomTabsOutputSchema` と `CustomTabActionResultSchema` で検証します。
[TypeScript Custom tab reference](../../../reference/typescript/extensions/customtab.md) を参照してください。

## Go

```go
err := app.Use(customtab.Extension().
  GetCustomTabs(handler.GetCustomTabs).
  Action("example.tab.open", handler.Open))
```

## 認証・WAM・検証

- 設定済み WAM root から tab を提供し、WAM name と安全な `wamArgs` だけを返します。
- Tab が表示されることは権限証明ではないため、privileged server operation ごとに再認可します。
- Host navigation、remount、unsupported surface、expired context を処理します。
- Registration、tab visibility、WAM load、permission、refresh、error recovery を test します。

[WAM reference](../../../reference/typescript/WAM.md) も参照してください。
