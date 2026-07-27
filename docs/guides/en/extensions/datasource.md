# DataSource Extension

Use DataSource to expose catalogs, tables, columns, and authenticated query results. Metadata uses
the normal Function route; query execution uses a separate DataSource gRPC endpoint.

## Contract

| Function                                     | Requirement | Purpose                             |
| -------------------------------------------- | ----------- | ----------------------------------- |
| `extension.datasource.catalog.listCatalogs`  | Required    | Lists catalogs                      |
| `extension.datasource.catalog.listTables`    | Required    | Pages table metadata                |
| `extension.datasource.catalog.describeTable` | Required    | Describes columns and table details |

The gRPC query service is not an app Function. Keep its endpoint, authentication, and streaming
limits separate from `/functions`.

## Metadata and query model

- Use `ListCatalogsInput/Output`, `ListTablesInput/Output`, and `DescribeTableInput/Output` with
  camelCase JSON fields. Catalog aliases and table names remain stable identifiers.
- `managerAccess: "owner"` limits discovery/query authorization to channel owners; `"all"` or an
  omitted value allows all channel managers. Keep the same or stricter rule in the local query
  allowlist.
- Description samples are optional and bounded to 10 rows and 64 KiB with keys matching declared
  columns.
- The gRPC handler receives a verified access-token identity. When one endpoint serves several apps,
  resolve signing keys and routing by the identity's app scope.

## TypeScript

Use `@Extension({ name: "datasource", systemVersion: "v1" })` with the exported catalog schemas,
then configure the authenticated DataSource gRPC server and a supported PostgreSQL or BigQuery
runner. See the [TypeScript DataSource reference](../../../reference/typescript/extensions/datasource.md).

## Go

```go
err := app.Use(datasource.Extension().
  ListCatalogs(handler.ListCatalogs).
  ListTables(handler.ListTables).
  DescribeTable(handler.DescribeTable))
```

Use the Go gRPC DataSource server and Arrow executor described in the
[Go DataSource example](../../../reference/go/EXTENSIONS.md#datasource-extension-and-query-server).

## Security and reliability

- Validate `x-access-token` and the datasource signature, then enforce app and tenant isolation.
- Allowlist catalogs/tables, parameterize SQL, restrict selectable columns, and cap rows, bytes,
  duration, and concurrency.
- Stream Arrow batches without buffering the full result and propagate cancellation.
- Test unauthorized identity, cross-tenant access, malformed SQL, timeouts, empty results, large
  batches, schema mismatch, and mid-stream failure.
