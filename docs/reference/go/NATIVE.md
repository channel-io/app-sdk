# Go Native Functions

Native Functions run in the opposite direction from app Functions: the Go app server asks AppStore or Channel to perform a platform-owned operation.

## Client Setup

```go
client := native.NewClient(
  native.WithHTTPClient(&http.Client{Timeout: 15 * time.Second}),
)
tokens := native.NewTokenManager(native.TokenManagerConfig{
  AppID:     appID,
  AppSecret: appSecret,
  Client:    client,
})
```

Use the default AppStore URL unless the target environment explicitly supplies another public base URL. Inject an `http.Client` with deadlines, tracing, and transport policy appropriate for the deployment.

## Public Typed Operations

The current Go client exposes typed methods for:

- `IssueToken` and `RefreshToken`;
- `RegisterExtension` and `UnregisterExtension`;
- `GetAlfTaskVersions` for ALF task sync verification; register ALF tasks through `RegisterExtension`;
- `GetAppNotebookVersions` for notebook sync verification; register notebooks through `RegisterExtension`;
- app data-table creation, schema, lookup, and row ingestion;
- raw and generic public Native Function calls through `CallNativeFunction` and `CallNative[T]`;
- typed Channel operations through `CreateProxyAPI`, starting with `WriteGroupMessage`;
- `CallAppFunction` for calling a registered app Function through AppStore.

Check the exported `native.Client` methods for the exact current surface. Do not copy an undocumented method name into application code.

## Token Scope

Obtain the token required by the operation:

```go
appToken, err := tokens.GetAppToken(ctx)
if err != nil {
  return err
}

result, err := client.RegisterExtension(
  ctx,
  appToken.AccessToken,
  appID,
  "command",
  "v1",
)
```

Use app tokens for app-owned registration and data operations. Server-side Channel operations require a channel token for the installed Channel. Never pass the App Secret as an access token.

## App Function Calls

`CallAppFunction` invokes another registered app Function through AppStore. It accepts an access token, app ID, method, params, Function context, and system version, and returns raw JSON for the caller to decode.

It is not a generic Channel native-operation method. Do not use it to call arbitrary native method names.

## Channel operations and generic calls

Use a channel-scoped token with the typed proxy:

```go
token, err := tokens.GetChannelToken(ctx, channelID)
if err != nil {
  return err
}

_, err = client.CreateProxyAPI(token.AccessToken).WriteGroupMessage(
  ctx,
  native.WriteGroupMessageParams{
    ChannelID: channelID,
    GroupID: groupID,
    DTO: native.WriteMessageDTO{PlainText: "Hello", BotName: "ExampleBot"},
  },
)
```

Prefer a typed client or proxy method. If the SDK exposes no wrapper for a public Native Function,
use `native.CallNative[T]` to retain typed decoding, or `client.CallNativeFunction` when the result
must remain raw JSON. Do not build a second HTTP transport in the app.

## Errors And Logging

The client returns errors for transport failures, non-success status, response decoding, and Function error envelopes. Wrap errors with operation context, but do not log request bodies, access/refresh tokens, provider credentials, or customer data.

## Testing

Use `native.WithHTTPClient` and a controlled test server to verify:

- request path and `PUT` method;
- `Content-Type` and `x-access-token` behavior;
- camelCase payload fields;
- Function error and non-2xx handling;
- context cancellation and timeouts.

The shared wire envelope is summarized in the [cross-language protocol](../protocol.md).

## AppPerson invocation callbacks

`appsdk.App.HandleRequest` binds the signed private
`Context.AppPersonInvocation` metadata to the handler's `context.Context`.
Pass this same `ctx` to Native methods and nested `CallAppFunction` calls. The
transport uses the invocation credential automatically, even if a caller supplies
an ordinary access-token argument. Bindings are immutable and local to each request;
never replace the handler context with `context.Background()` for these calls.

```go
receipt, err := client.ReplyToAppPersonInvocation(ctx, "", native.ReplyToAppPersonInvocationParams{
  InvocationID: fnCtx.AppPersonInvocation.InvocationID,
  PlainText:    "The requested operation completed.",
})
```

The request accepts only the invocation ID and nonempty literal text (at most
10,000 Unicode code points). The server chooses the fixed original source and app
author. UserChat replies remain private notes and suppress app dispatch. Group and
UserChat use the shared channel connection; DM uses the initiating manager.
Only single-app Hook invocations can reply. Repeat the same text to reconcile an
uncertain response; changed text cannot create another reply. Response status is
`published`, `rejected`, or `unknown`; the Hook ACK is a separate handling result.

The server owns the credential's 180-second lifetime. During an invocation,
`GetAppToken` and same-channel `GetChannelToken` return it without caching, with an
empty refresh token and zero `ExpiresIn`. Token issue/refresh and foreign-channel
requests fail locally. A present null, incomplete, or malformed metadata marker
fails before the handler runs. Never persist, log, or return this private context.
The metadata's `String` and `GoString` methods redact common `fmt` logging; raw JSON
still contains the credential for transport and must not be logged.

This binding scopes SDK callbacks during signed invocation dispatch. Separately
held app secrets and ordinary credentials retain their independent existing
authority; it is not a sandbox for arbitrary app code. Outside invocation dispatch,
ordinary Native credentials and token caching keep their existing behavior.
