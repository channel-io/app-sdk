# DataSource Extension

Catalog, table, column metadata와 인증된 query result를 제공할 때 사용합니다. Metadata는 일반
Function route를, query 실행은 별도 DataSource gRPC endpoint를 사용합니다.

## 계약

| Function                                     | 필수 여부 | 역할                       |
| -------------------------------------------- | --------- | -------------------------- |
| `extension.datasource.catalog.listCatalogs`  | 필수      | Catalog 목록               |
| `extension.datasource.catalog.listTables`    | 필수      | Table metadata pagination  |
| `extension.datasource.catalog.describeTable` | 필수      | Column과 table detail 설명 |

gRPC query service는 app Function이 아닙니다. Endpoint, authentication, streaming limit을
`/functions`와 분리합니다.

## Metadata·query 모델

- CamelCase JSON field의 `ListCatalogsInput/Output`, `ListTablesInput/Output`,
  `DescribeTableInput/Output`을 사용합니다. Catalog alias와 table name은 stable identifier입니다.
- `managerAccess: "owner"`는 discovery/query authorization을 channel owner로 제한합니다. `"all"`
  또는 생략은 모든 channel manager를 허용합니다. Local query allowlist는 같거나 더 엄격해야 합니다.
- Description sample은 선택이며 10 row와 64 KiB로 제한하고 key가 선언 column과 일치해야 합니다.
- gRPC handler는 검증된 access-token identity를 받습니다. 하나의 endpoint가 여러 app을 제공하면
  identity의 app scope로 signing key와 route를 결정합니다.

## TypeScript

`@Extension({ name: "datasource", systemVersion: "v1" })`과 공개 catalog schema를 사용하고,
인증된 DataSource gRPC server와 지원되는 PostgreSQL 또는 BigQuery runner를 구성합니다.
[TypeScript DataSource 레퍼런스](../../../reference/typescript/extensions/datasource.md)를 확인하세요.

## Go

```go
err := app.Use(datasource.Extension().
  ListCatalogs(handler.ListCatalogs).
  ListTables(handler.ListTables).
  DescribeTable(handler.DescribeTable))
```

[Go DataSource 예제](../../../reference/go/EXTENSIONS.md#datasource-extension-and-query-server)의 gRPC
server와 Arrow executor를 사용합니다.

## 보안·신뢰성

- `x-access-token`과 datasource signature를 검증하고 app/tenant isolation을 강제합니다.
- Catalog/table allowlist, parameterized SQL, column 제한, row/byte/time/concurrency limit을
  적용합니다.
- 전체 결과를 memory에 모으지 말고 Arrow batch를 stream하며 cancellation을 전달합니다.
- Unauthorized identity, cross-tenant access, malformed SQL, timeout, empty result, large batch,
  schema mismatch, mid-stream failure를 테스트합니다.
