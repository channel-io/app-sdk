# Function Registration

A Function is a typed RPC that Channel or another app sends to an app server. The request `method`
is the full Function name and `params` is its input. Register app-owned Functions as standalone
names such as `orders.get`; standard Extension Functions combine an Extension name with a relative
name.

## Wire contract

Incoming calls use this JSON-RPC-like envelope:

```json
{
  "method": "orders.get",
  "params": { "orderId": "order-1" },
  "context": {
    "caller": { "type": "manager", "id": "manager-id" },
    "channel": { "id": "channel-id" }
  },
  "systemVersion": "v1"
}
```

- `method`: the exact full Function name exposed by discovery
- `params`: untrusted input validated by a schema
- `context`: surface-dependent caller, Channel, language, auth, and config data
- `systemVersion`: selects an Extension contract version when required

Public JSON fields use camelCase in both TypeScript and Go. Trust `context` only after the raw-body
`x-signature` verification succeeds.

Return `result` for success and a structured `error` for an expected failure.

```json
{ "result": { "id": "order-1" } }
```

```json
{
  "error": {
    "code": 2,
    "type": "invalidParams",
    "message": "orderId is required"
  }
}
```

Common codes are `1` for unprocessable input, `2` for bad request, `3` for not found, `4` for
unauthorized, `-32601` for method not found, and `-32603` for internal error. Keep `type` stable for
programmatic handling and never put credentials or customer data in errors. The
[shared protocol](../../reference/protocol.md) defines the complete envelope.

## Incoming handling and discovery

Register the Function root in the developer portal. AppStore calls the route with a system version.

```text
Function Endpoint: https://app.example.com/functions
Actual request:    PUT https://app.example.com/functions/v1
```

The SDK handles routing, dispatch, schema validation, error envelopes, and
`extension.core.function.getFunctions` discovery. Do not build a second raw JSON-RPC router or a
manual discovery response. Verify the exact request bytes with `SignatureGuard` and
`rawBody: true` in TypeScript, or `server.WithSignature` in Go.

## TypeScript

Use the decorator API with Zod schemas.

```ts
@Func("orders.get")
@InputSchema(z.object({ orderId: z.string() }))
@OutputSchema(z.object({ id: z.string() }))
async getOrder(@Ctx() ctx: Context, @Input() input: { orderId: string }) {
  return this.service.getOrder(ctx.channel.id, input.orderId);
}
```

On a provider with `@Extension({ name: "command" })`, `@Func("metadata.getCommands")` becomes
`extension.command.metadata.getCommands`. Do not create a fake Extension for a standalone
Function. Add every decorated class to the NestJS module's `providers` so discovery can find it.

## Go

Go uses builders and generic handlers.

```go
type GetOrderInput struct {
  OrderID string `json:"orderId"`
}

type GetOrderOutput struct {
  ID string `json:"id"`
}

appsdk.MustRegister(
  app,
  "orders.get",
  func(ctx context.Context, fnCtx appsdk.Context, in *GetOrderInput) (*GetOrderOutput, error) {
    return &GetOrderOutput{ID: in.OrderID}, nil
  },
)
```

`appsdk.Register` and `appsdk.MustRegister` derive schemas from Go structs and call
`Validate() error` when the input implements it. Use `appsdk.InputSchema`, `appsdk.OutputSchema`,
or proto helpers for an explicit contract.

## Call Native and app Functions

A Native Function reverses the direction: the app asks Channel to perform an operation. Obtain an
app or channel token from `TokenManager` and prefer a typed proxy or client. The current
TypeScript `NativeFunctionTypeMap` and exported Go `native.Client` methods are the source of truth,
not a static list copied into documentation.

Use the SDK app-function client when calling another app's registered Function or your own Function
through AppStore.

```ts
const result = await nativeClient.callAppFunction<Input, Output>(
  targetAppId,
  "orders.get",
  { orderId: "order-1" },
  ctx,
  channelToken.accessToken,
);
```

```go
result, err := client.CallAppFunction(
  ctx,
  channelToken.AccessToken,
  targetAppID,
  "orders.get",
  map[string]any{"orderId": "order-1"},
  fnCtx,
  "",
)
```

A valid access token does not replace business authorization. Recheck the relationship among the
target app, installed Channel, caller, and requested resource in the handler. Read the
[TypeScript Native Function reference](../../reference/typescript/NATIVE.md) and
[Go Native Function reference](../../reference/go/NATIVE.md) for exact APIs.

## Extension builders

Prefer a standard Extension helper that owns the SDK schemas and Function names. Go builder
packages include `extension/config`, `extension/oauth`, `extension/calendar`,
`extension/command`, `extension/widget`, `extension/customtab`, `extension/hook`,
`extension/polling`, `extension/store`, `extension/messaging`, `extension/alftask`, and
`extension/wms`. Isolate generic registration to standalone Functions without an SDK helper.

Continue with the [Command guide](extensions/command.md), [WAM guide](wam.md),
[Extension guide](extensions.md), and [production readiness guide](app-development.md).
