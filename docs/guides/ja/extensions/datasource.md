# DataSource Extension

Catalog、table、column metadata と認証済み query result を提供するときに使います。Metadata は
通常の Function route、query execution は別の DataSource gRPC endpoint を使います。

## Contract

| Function                                     | 必須 | 役割                          |
| -------------------------------------------- | ---- | ----------------------------- |
| `extension.datasource.catalog.listCatalogs`  | 必須 | Catalog list                  |
| `extension.datasource.catalog.listTables`    | 必須 | Table metadata pagination     |
| `extension.datasource.catalog.describeTable` | 必須 | Column と table detail を説明 |

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

## TypeScript

`@Extension({ name: "datasource", systemVersion: "v1" })` と公開 catalog schema を使い、認証済み
DataSource gRPC server と対応する PostgreSQL/BigQuery runner を構成します。
[TypeScript DataSource reference](../../../reference/typescript/extensions/datasource.md) を参照してください。

## Go

```go
err := app.Use(datasource.Extension().
  ListCatalogs(handler.ListCatalogs).
  ListTables(handler.ListTables).
  DescribeTable(handler.DescribeTable))
```

[Go DataSource example](../../../reference/go/EXTENSIONS.md#datasource-extension-and-query-server) の
gRPC server と Arrow executor を使います。

## Security・信頼性

- `x-access-token` と datasource signature を検証し、app/tenant isolation を強制します。
- Catalog/table allowlist、parameterized SQL、column 制限、row/byte/time/concurrency limit を適用します。
- 全結果を memory に保持せず Arrow batch を stream し、cancellation を伝播します。
- Unauthorized identity、cross-tenant access、malformed SQL、timeout、empty result、large batch、
  schema mismatch、mid-stream failure を test します。
