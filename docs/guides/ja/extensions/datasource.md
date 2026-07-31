# DataSource Extension

Catalog、table、column metadata と認証済み query result を提供するときに使います。Metadata は
通常の Function route、query execution は別の DataSource gRPC endpoint を使います。

## Contract

| Function                                     | 必須 | 役割                          |
| -------------------------------------------- | ---- | ----------------------------- |
| `extension.datasource.catalog.listCatalogs`  | 必須 | Catalog list                  |
| `extension.datasource.catalog.listTables`    | 必須 | Table metadata pagination     |
| `extension.datasource.catalog.describeTable` | 必須 | Column と table detail を説明 |
| `extension.datasource.query.authorizeQuery`  | 任意 | 動的 row allow-list を適用    |

gRPC query service は app Function ではありません。Endpoint、authentication、streaming limit を
`/functions` と分離します。

## Metadata・query model

- CamelCase JSON field の `ListCatalogsInput/Output`、`ListTablesInput/Output`、
  `DescribeTableInput/Output` を使います。Catalog alias と table name は stable identifier です。
- `managerAccess: "owner"` は discovery/query authorization を channel owner に制限します。
  `"all"` または省略は全 channel manager を許可します。Local query allowlist は同等以上に
  厳しくします。
- Description sample は任意で、10 row/64 KiB 以下、key は宣言 column と一致させます。
- gRPC handler は検証済み access-token identity を受け取ります。一つの endpoint が複数 app を
  提供する場合、identity の app scope で signing key と route を決めます。
- 動的 row scope が必要な場合だけ `authorizeQuery` を実装します。Raw SQL ではなく canonical な
  table/column access を受け取り、構造化 string allow-list だけを返します。空 values は 0 row になります。
- AppStore は実 query ごとに一度呼び出し、timeout は 2 秒、retry/cache はなく、error は fail closed です。
  Handler から同じ datasource query API を再帰的に呼び出さないでください。

## TypeScript

`@Extension({ name: "datasource", systemVersion: "v1" })` と公開 catalog schema を使い、認証済み
DataSource gRPC server と対応する PostgreSQL/BigQuery runner を構成します。
[TypeScript DataSource reference](../../../reference/typescript/extensions/datasource.md) を参照してください。

## Go

```go
err := app.Use(datasource.Extension().
  ListCatalogs(handler.ListCatalogs).
  ListTables(handler.ListTables).
  DescribeTable(handler.DescribeTable).
  AuthorizeQuery(handler.AuthorizeQuery)) // 任意
```

[Go DataSource example](../../../reference/go/EXTENSIONS.md#datasource-extension-and-query-server) の
gRPC server と Arrow executor を使います。

## Security・信頼性

- `x-access-token` と datasource signature を検証し、app/tenant isolation を強制します。
- Catalog/table allowlist、parameterized SQL、column 制限、row/byte/time/concurrency limit を適用します。
- 全結果を memory に保持せず Arrow batch を stream し、cancellation を伝播します。
- Unauthorized identity、cross-tenant access、malformed SQL、timeout、empty result、large batch、
  schema mismatch、mid-stream failure を test します。
