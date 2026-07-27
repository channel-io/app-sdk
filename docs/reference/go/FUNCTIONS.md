# Go Functions And Schemas

## Function Model

A Function is one typed operation executed by the app server. The request envelope has a full `method` name, untrusted `params`, and trusted `context` after signature verification.

Use a standalone name such as `orders.get` for app-specific behavior. Standard Extension builders produce names such as `extension.command.metadata.getCommands`.

## Typed Registration

```go
type GetOrderInput struct {
  OrderID string `json:"orderId" schema:"description=Order identifier"`
}

func (in *GetOrderInput) Validate() error {
  if strings.TrimSpace(in.OrderID) == "" {
    return errors.New("orderId is required")
  }
  return nil
}

type GetOrderOutput struct {
  ID string `json:"id"`
}

appsdk.MustRegister(
  app,
  "orders.get",
  func(
    ctx context.Context,
    fnCtx appsdk.Context,
    input *GetOrderInput,
  ) (*GetOrderOutput, error) {
    return &GetOrderOutput{ID: input.OrderID}, nil
  },
  appsdk.Description("Get one order"),
)
```

Use `appsdk.Register` when startup should return an error and `appsdk.MustRegister` when invalid registration should panic. `appsdk.RegisterInput` is available when the output is intentionally dynamic.

## Context

`appsdk.Context` can contain:

- `Caller`, `Channel`, `User`, `UserChat`, and `Language`;
- `AuthToken` for an external OAuth provider;
- `Config` for Config Extension values;
- sandbox/session fields when that execution surface provides them.

Optional fields are not guaranteed. Use `fnCtx.GetAuthToken()` to read the injected OAuth provider
token. Do not confuse this provider token with app/channel tokens from `native.TokenManager`.

## Schemas

`appsdk.Register` derives input and output JSON Schema from Go types. Use `json` tags for wire names and `schema` tags for supported metadata such as `description`, `format`, `enum`, `title`, `default`, `required`, and `optional`.

For an explicit contract, use:

- `appsdk.InputSchema`
- `appsdk.OutputSchema`
- `appsdk.PatchInputSchema`
- `appsdk.PatchOutputSchema`
- helpers in the `schema` package

Standard Extension DTOs and schemas should come from the matching `extension/*` package. For generated protobuf DTOs, use `appsdk.RegisterProto`, `appsdk.MustRegisterProto`, or the proto-input variants so JSON uses protobuf field names and semantics.

## Outputs And Errors

Return a typed output pointer for ordinary Functions. For a standard output with provider-specific top-level fields, use `appsdk.WithExtraFields` and `appsdk.ExtensibleOutput`; do not silently redefine a standard SDK field.

Return `appsdk.NewError(code, type, message)` for a public Function error. Use `appsdk.MapErrors` or the app-level `ErrorMapper` to translate service errors into stable public errors. Do not return secrets, tokens, or raw provider responses.

## Test Functions

Register test-only Functions with `appsdk.RegisterTest` or `appsdk.MustRegisterTest`. They appear in `getTestFunctions` but not normal discovery.

Use `testkit` without starting HTTP:

```go
response := testkit.Call(t, app, "orders.get", GetOrderInput{OrderID: "order-1"})
functions := testkit.Functions(t, app)
testFunctions := testkit.TestFunctions(t, app)
```

Test handler behavior, discovery names, schemas, validation failures, and stable error mapping separately.
