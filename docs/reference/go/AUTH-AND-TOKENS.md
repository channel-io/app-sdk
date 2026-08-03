# Go Authentication And Tokens

Go apps use the same trust model as TypeScript apps. Keep inbound request authentication, server native authorization, WAM manager/user authorization, and external provider credentials separate.

## Credential Map

| Value                        | Represents                                                  | Where it belongs                                         |
| ---------------------------- | ----------------------------------------------------------- | -------------------------------------------------------- |
| App ID                       | Public identity of the app                                  | Server and WAM may use it                                |
| App Secret                   | Long-lived credential used to issue app/channel token pairs | Server secret manager only                               |
| Signing Key                  | HMAC key for Function requests from AppStore                | Server secret manager only                               |
| App access/refresh token     | App-scoped native operations such as Extension registration | Server token cache                                       |
| Channel access/refresh token | Server-side operations in one installed Channel             | Per-channel server token cache                           |
| Manager/User authorization   | Current user acting through a Channel client                | Managed by the WAM host runtime                          |
| Provider OAuth token         | Connected external provider                                 | Injected into `appsdk.Context.AuthToken` when needed     |
| Config credential            | API keys, `client_credentials`, and per-shop secrets        | Stored by AppStore and injected through `Context.Config` |

## Incoming Function Requests

Enable raw-body signature verification:

```go
if strings.TrimSpace(signingKey) == "" {
  log.Fatal("SIGNING_KEY is required")
}

if err := server.Run(
  app,
  server.WithSignature(signingKey),
  server.WithAutoRegister(),
); err != nil {
  log.Fatal(err)
}
```

The SDK decodes the hex Signing Key, calculates HMAC-SHA256 over the exact request body, encodes it as Base64, and compares it with `x-signature`. Never disable verification in a deployed app or trust `appsdk.Context` before verification.

## Token Manager

Use `native.TokenManager` for app and channel tokens:

```go
client := native.NewClient()
tokens := native.NewTokenManager(native.TokenManagerConfig{
  AppID:     appID,
  AppSecret: appSecret,
  Client:    client,
})

appToken, err := tokens.GetAppToken(ctx)
channelToken, err := tokens.GetChannelToken(ctx, channelID)
```

The manager:

- caches token pairs by app or channel scope;
- refreshes before expiry, with a five-minute default buffer;
- immediately refreshes a newly issued token once when its lifetime is already inside that buffer;
- re-issues after a failed refresh;
- deduplicates concurrent issue/refresh work in one process;
- supports invalidation and a custom `native.TokenCache`.

`IssueToken` and `RefreshToken` share a rate limit of 10 calls per 30 minutes per app. Do not issue a token for every Function request. Calling `IssueToken` without a Channel ID creates an app token; providing the ID of an installed Channel creates a channel token for permitted server-side operations in that Channel. Both calls return an access/refresh token pair and `ExpiresIn` in seconds. Direct calls to `native.Client.IssueToken` do not provide caching or refresh management.

## Multiple Replicas

`native.InMemoryTokenCache` is process-local. Multiple replicas should implement `native.TokenCache` with shared storage such as Redis or a database so token pairs are shared. For strict cross-replica coordination, the cache can also implement the optional `native.TokenCacheLocker` interface:

```go
func (c *RedisTokenCache) WithLock(
  ctx context.Context,
  key string,
  fn func(context.Context) error,
) error {
  return c.distributedLock.WithLock(ctx, "token-manager:"+key, fn)
}
```

`TokenManager` acquires this lock after process-local deduplication and reads the shared cache again while holding it. The implementation must use a distributed per-key lock, invoke `fn` exactly once, return its error unchanged, and release the lock after success or failure. Set the lock lease and wait timeout longer than the AppStore request timeout. A shared cache without `TokenCacheLocker` still shares completed tokens, but simultaneous cache misses in different replicas can each issue a token.

The cache stores access and refresh tokens. Encrypt them as appropriate for the storage layer, restrict access, apply TTL, and never log cache values.

## App And Channel Tokens

- Use an **app token** for `RegisterExtension`, `RegisterAlfTasks`, notebook sync, and app-owned data operations.
- Use a **channel token** for a server-side Channel operation performed as the installed app or bot.

The public Go client does not currently expose a generic or typed Channel-operation proxy equivalent to TypeScript `createProxyApi`. Check [Native Functions](NATIVE.md) and [Feature Parity](../go-feature-parity.md) before implementing a narrow transport adapter.

## Auto-Registration

`server.WithAutoRegister()` uses a shared `native.TokenManager` to obtain an app token and register declared Extension targets. Provide your own manager with `server.WithAutoRegisterTokenManager` when the server and application code should share the same cache.

Registration authorization and inbound request authentication are independent: an app still needs `WithSignature` after registration succeeds.

## WAM Authorization

The Go server does not issue manager/user tokens. A WAM calls the Channel host through `useNativeFunction`, and the host authorizes the current surface and user. For app/bot work, the WAM should use `useCallFunction`; the Go handler can then obtain a channel token without exposing it to the browser.

## External Provider Authentication

- OAuth Authorization Code connections provide the external provider token through `fnCtx.AuthToken` or `fnCtx.GetAuthToken()`.
- API keys, `client_credentials`, and per-shop secrets belong in Config Extension storage and
  arrive through `fnCtx.Config`.

These are provider credentials, not Channel app/channel tokens. Read them only in the handler that needs them and never place them in WAM data, Function errors, or logs.
