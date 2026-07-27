# Notebook Extension

Version 付き app-managed notebook/cell definition を公開するときに使います。

## Contract

`extension.notebook.core.getNotebooks` が必須で、registration は 2 段階です。

1. `notebook:v1` を登録します。
2. Cached app token で `registerAppNotebooks` を呼び、definition を sync します。

各 notebook は stable key、正の整数 version、title、optional initial visibility、cell を含みます。
対応 cell type は `markdown`、`sql`、`python`、`input`、`chart`、`table`、`single_value` で、
optional tab と row/column layout は stable cell key を参照します。

## TypeScript

`@Extension({ name: "notebook", systemVersion: "v1" })`、`GetNotebooksInputSchema`、
`GetNotebooksResponseSchema` を使います。Notebook/cell key を安定させます。
[TypeScript Notebook reference](../../../reference/typescript/extensions/notebook.md) を参照してください。

## Go

```go
err := app.Use(notebook.Extension().GetNotebooks(handler.GetNotebooks))
```

Auto-registration 後、管理された startup/release step で Go native client の notebook sync を
呼びます。

## Security・検証

- Definition が変わると version を上げ、異なる content に同じ version を再利用しません。
- 外部 Markdown、URL、rendered data を untrusted input として扱います。
- Definition/cell に credential や private record を含めません。
- Discovery、extension registration、secondary sync、version readback、invalid cell、削除 notebook、
  localization、safe rendering を test します。

[Go native reference](../../../reference/go/NATIVE.md) も参照してください。
