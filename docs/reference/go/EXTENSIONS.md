# Go Extensions

For the overall Go app model, Function lifecycle, server, authentication, and native calls, start with the [Go SDK Reference](README.md). This document covers Extension builders and advanced implementation patterns.

Go extension helpers use fluent builders instead of TypeScript decorators.
Each builder declares the extension for auto-registration and registers selected
functions with generated schemas.

```go
app.Use(command.Extension().
  GetCommands(command.StaticCommands(command.Config{
    Name: "meeting",
    Scope: command.ScopeDesk,
    ActionFunctionName: "commands.meeting.execute",
    AlfMode: command.AlfModeDisable,
  })).
  Execute("commands.meeting.execute", executeMeeting),
)
```

For custom extensions or gaps, use the generic builder:

```go
app.Use(extension.New("custom").
  ExtensionFunc(
    "metadata.getProfile",
    appsdk.Input[extension.Empty](),
    appsdk.Output[Profile](),
    appsdk.Handle(extension.Static(Profile{})),
  ).
  Func("custom.runtime.execute", appsdk.Input[Input](), appsdk.Output[Output](), appsdk.Handle(execute)),
)
```

Inside a family-specific builder, use `ExtensionFunction` when you want the
same relative naming style as TypeScript decorators:

```go
app.Use(command.Extension().
  ExtensionFunction(
    "command.execute",
    appsdk.Input[command.ExecuteRequest](),
    appsdk.Output[command.ActionResult](),
    appsdk.Handle(execute),
  ),
)
```

Use `Function` when the handler is a plain app function referenced by metadata,
such as `commands.meeting.execute` or `widgets.quickActions.action`.

For generated proto DTOs, use the proto registration helper when you register a
function directly:

```go
appsdk.MustRegisterProto(app, wms.FunctionGetOrders, getOrders)
```

When only the request DTO has moved to SDK proto types and the response still
comes from an existing app/service DTO, use proto input registration:

```go
appsdk.MustRegisterProtoInput(app, wms.FunctionGetOrders, getOrders)
```

Extension output types should still be SDK-owned when the fields are part of the
shared app contract. If an app needs to add provider-specific fields to an
otherwise standard output, return the SDK output plus top-level extra fields:

```go
appsdk.MustRegisterProtoInput(
  app,
  wms.FunctionGetOrders,
  func(ctx context.Context, fnCtx appsdk.Context, input *wms.GetOrdersRequest) (any, error) {
    return appsdk.WithExtraFields(
      &wms.GetOrdersResponse{Orders: []*wms.Order{}},
      appsdk.ExtraFields{"shopId": "provider-shop-id"},
    ), nil
  },
  appsdk.ExtensibleOutput[wms.GetOrdersResponse](
    schema.Property("shopId", map[string]any{"type": "string"}),
  ),
)
```

Extra fields are merged into the result JSON object, not nested under an
`extra` key. They must not reuse a field already defined by the SDK output type.
For nested app-specific fields, patch the canonical output schema at the object
path you are extending:

```go
wms.FunctionOptions(
  wms.FunctionGetOrders,
  appsdk.PatchOutputSchema(schema.ExtendObjectAt(
    "orders[]",
    schema.Property("shopId", map[string]any{"type": "string"}),
  )),
)
```

The path syntax uses `.` for object properties and `[]` for array items.

Family builders such as `commerce.Extension()` and `wms.Extension()` use proto JSON handling
internally, so app handlers receive SDK DTOs while the wire format stays camelCase JSON.

## Builder Packages

| Extension  | Go package             |
| ---------- | ---------------------- |
| Config     | `extension/config`     |
| OAuth      | `extension/oauth`      |
| Calendar   | `extension/calendar`   |
| Command    | `extension/command`    |
| Widget     | `extension/widget`     |
| Custom tab | `extension/customtab`  |
| Hook       | `extension/hook`       |
| Polling    | `extension/polling`    |
| Store      | `extension/store`      |
| DataSource | `extension/datasource` |
| Commerce   | `extension/commerce`   |
| Messaging  | `extension/messaging`  |
| ALF task   | `extension/alftask`    |
| Notebook   | `extension/notebook`   |
| WMS        | `extension/wms`        |
| Mail relay | `extension/mailrelay`  |
| Custom     | `extension`            |

Server-side extension DTOs are defined in proto first. Go extension packages
either expose generated DTOs directly, as `extension/wms` and
`extension/messaging` do, or expose `Proto*` aliases alongside existing
hand-written ergonomic structs. App code should import the family package rather
than the generated internal package.

```go
app.Use(messaging.Extension().
  InboxOnMediumMessageCreated(func(
    ctx context.Context,
    fnCtx appsdk.Context,
    input *messaging.OnMediumMessageCreatedInput,
  ) (*messaging.OnMediumMessageCreatedOutput, error) {
    return &messaging.OnMediumMessageCreatedOutput{
      SendResult: &messaging.SendResult{SendState: "sent"},
    }, nil
  }),
)
```

For rollout or app-specific gaps, the messaging builder still supports
`Function(...)` and `ExtensionFunction(...)` so SDK-based and existing handlers
can be mixed in one app.

## Commerce Extension

Use `extension/commerce` for new commerce order-management apps:

```go
app.Use(commerce.Extension().
  GetAppConfigs(handler.GetAppConfigs).
  GetOrders(handler.GetOrders).
  RequestCancelOrder(handler.RequestCancelOrder).
  RequestReturnOrder(handler.RequestReturnOrder).
  AcceptReturnOrder(handler.AcceptReturnOrder).
  RequestExchangeOrder(handler.RequestExchangeOrder).
  GetExchangeableItems(handler.GetExchangeableItems).
  ChangeShippingAddress(handler.ChangeShippingAddress))
```

Commerce uses stable ID-based orders and structured action results. Validate current provider state
and use an idempotency key before every mutation.

## WMS Extension

Use `extension/wms` for warehouse-management apps. WMS request and response DTOs
are generated from `extension.proto` and handled with proto JSON.

```go
app.Use(wms.Extension().
  OrderGetOrders(func(ctx context.Context, fnCtx appsdk.Context, input *wms.OrderGetOrdersRequest) (*wms.OrderGetOrdersResponse, error) {
    return &wms.OrderGetOrdersResponse{Orders: []*wms.OrderV2{}}, nil
  }),
)
```

## DataSource Extension And Query Server

Datasource metadata is served through JSON-RPC extension functions:

- `extension.datasource.catalog.listCatalogs`
- `extension.datasource.catalog.listTables`
- `extension.datasource.catalog.describeTable`
- optional `extension.datasource.query.authorizeQuery`

Query execution is not a JSON-RPC function. Implement
`io.channel.datasource.v1.DataSourceService.ExecuteQuery` with
`datasource/grpc` and stream `QueryChunk` values.

```go
app.Use(datasource.StaticMetadata(datasource.Metadata{
  Catalogs: []datasource.Catalog{
    {Alias: "bigquery", Dialect: datasource.DialectBigQuery},
  },
  Tables: []datasource.TableListing{
    {
      Table: datasource.Table{
        Name: "orders",
        LocalCatalogAlias: "bigquery",
        ManagerAccess: datasource.ManagerAccessOwner,
      },
    },
  },
  Definitions: []datasource.TableDefinition{
    {
      Table: datasource.Table{Name: "orders", LocalCatalogAlias: "bigquery"},
      Columns: []datasource.Column{
        {Name: "channel_id", Type: "STRING", Nullable: false, PartitionKey: true},
        {Name: "order_id", Type: "STRING", Nullable: false},
      },
      PrimaryKey: []string{"channel_id", "order_id"},
    },
  },
}))
```

Add query authorization only when the app needs dynamic row scope:

```go
app.Use(datasource.StaticMetadata(metadata).
  AuthorizeQuery(func(ctx context.Context, fnCtx appsdk.Context, input *datasource.AuthorizeQueryInput) (*datasource.AuthorizeQueryOutput, error) {
    scopeKeys, err := loadQueryEntitlements(ctx, fnCtx.Channel.ID, input.GetTables())
    if err != nil {
      return nil, err
    }
    return &datasource.AuthorizeQueryOutput{
      Authorized: true,
      Filters: []*datasource.QueryFilter{
        {Table: "orders", Column: "scope_key", Values: scopeKeys},
      },
    }, nil
  }))
```

`AuthorizeQuery` is optional and is registered only when the builder method is
used, or when `FromProvider` receives a provider that also implements
`QueryAuthorizer`. AppStore calls it once immediately before an actual query,
passes canonical table/column access metadata instead of raw SQL, and rewrites
the query from structured string allow-list filters. Empty values yield zero
rows. The call has a 2-second timeout, no retry or cache, and fails closed. Keep
the handler read-only, do not log filter values, and do not recursively call the
same datasource query path.

Set `ManagerAccess` to `datasource.ManagerAccessOwner` when only channel
Owner-role managers may discover, describe, or query a table. Use
`datasource.ManagerAccessAll`, or leave it empty, to allow all channel managers.
AppStore remains the authorization authority.

For production BigQuery sources, use the Storage API executor. It creates a
query job, waits for the destination result table, and relays BigQuery Storage
Arrow schema/record batches without materializing rows as JSON.

```go
executor, err := bigquery.NewExecutor(ctx, bigquery.Config{
  ProjectID: "example-project",
  CredentialsEnvVars: []string{
    "BIGQUERY_CREDENTIALS_JSON",
  },
  Sources: []bigquery.SourceConfig{
    {
      SourceID:  "bigquery",
      DatasetID: "example_dataset",
      Tables: []datasource.TableConfig{
        {Name: "orders", TenantColumn: "channel_id"},
      },
    },
  },
})
if err != nil {
  return err
}

managed := grpcdatasource.NewManagedServer(
  grpcdatasource.NewExecuteQueryHandler(executor),
  grpcdatasource.ManagedServerConfig{
    Enabled:    true,
    Port:       "8443",
    SigningKey: os.Getenv("APP_SIGNING_KEY"),
    AuthRequired: true,
  },
)
```

AppStore calls datasource gRPC with `x-access-token` and `x-signature`
metadata. The SDK verifies `x-signature` with the hex-encoded app signing key,
then exposes the decoded access-token identity through
`AccessTokenIdentityFromContext(ctx)`.

When one gRPC endpoint serves multiple apps, resolve the signing key from the
access token's app scope and route by `identity.AppID`.

```go
func signingKeyResolver(_ context.Context, identity grpcdatasource.AccessTokenIdentity) (string, error) {
  switch identity.AppID {
  case os.Getenv("APP_A_ID"):
    return os.Getenv("APP_A_SIGNING_KEY"), nil
  case os.Getenv("APP_B_ID"):
    return os.Getenv("APP_B_SIGNING_KEY"), nil
  default:
    return "", fmt.Errorf("unsupported datasource app id: %s", identity.AppID)
  }
}

managed := grpcdatasource.NewManagedServer(
  grpcdatasource.NewExecuteQueryHandler(queryExecutor),
  grpcdatasource.ManagedServerConfig{
    Enabled:            true,
    Port:               "8443",
    SigningKeyResolver: signingKeyResolver,
    AuthRequired:       true,
  },
)
```

For PostgreSQL, use `datasource/postgres.NewExecutor(...)` or the generic
`datasource/sqlrunner.NewExecutor(...)` with any `database/sql` driver. The SQL
runner streams `sql.Rows` into Arrow IPC schema and record-batch chunks by
batch, so it does not keep the full result in memory.

```go
executor, err := postgres.NewExecutor(ctx, postgres.Config{
  Sources: []postgres.SourceConfig{
    {
      SourceID: "postgresql",
      DSNEnv:   "APP_DATABASE_URL",
      Tables:   []datasource.TableConfig{{Name: "orders", TenantColumn: "channel_id"}},
    },
  },
})
```

`datasource/bigquery.NewHandler(...)` and `datasource/postgresql.NewHandler(...)`
remain available for custom row emitters or existing app-owned query paths, but
new production data sources should prefer the executor helpers above.

## Mail Relay Extension

Use `extension/mailrelay` for normalized inbound mail delivery:

```go
app.Use(mailrelay.Extension().OnMailReceived(handler.OnMailReceived))
```

Deduplicate `sesMessageId` before side effects. Return `retryableFailure` only for temporary
failures, and never log or return raw MIME, attachment data, relay tokens, or provider PII.
