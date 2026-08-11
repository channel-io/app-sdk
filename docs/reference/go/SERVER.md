# Go Server And Routing

## Default Server

Use `server.Run` when the app does not already own an HTTP framework:

```go
app := appsdk.New(appsdk.Options{
  AppID:     os.Getenv("APP_ID"),
  AppSecret: os.Getenv("APP_SECRET"),
})

if err := server.Run(
  app,
  server.WithAddr(":8080"),
  server.WithSignature(os.Getenv("SIGNING_KEY")),
  server.WithAutoRegister(),
); err != nil {
  log.Fatal(err)
}
```

The default Function route is `PUT /functions/:version`. Register the `/functions` root in the
developer portal. Versioned discovery appends the registered system version, while callers without a
system version can invoke the bare root. If no managed ingress maps that root to `/functions/v1`,
mount it to the same verified SDK handler:

```go
server.Engine().PUT("/functions", server.Handler().Handle)
```

Do not create a second dispatcher or bypass the SDK signature option.

The `:version` route parameter and request `systemVersion` carry the AppStore system contract; they
select a registered handler and discovery catalog for that contract. The route version is
authoritative; a body version must match it and an omitted body version inherits it. After signature
verification, the SDK dispatches by `(systemVersion, method)` without cross-version fallback. This
is not a developer-owned API namespace: use distinct Function names such as `orders.getV2` when an
app-owned standalone contract must evolve without breaking existing callers.

## Existing Gin Server

Mount the SDK route on an existing engine:

```go
router := gin.New()
route := sdkgin.NewRoute(
  app,
  sdkgin.WithSignature(os.Getenv("SIGNING_KEY")),
  sdkgin.WithAutoRegister(),
)
route.Mount(router)
```

Use `sdkgin.WithEngine` with `sdkgin.NewServer` when the SDK should mount and run an existing engine. Use `sdkgin.NewHandler` or `NewHandlerRoute` only when an existing request registry implements `RequestHandler`; new apps should normally use `appsdk.App` directly.

## Signature Verification

`server.WithSignature` and `sdkgin.WithSignature` verify the Base64 HMAC-SHA256 `x-signature` over the exact raw request body with the hex-encoded Signing Key. The Gin handler reads raw bytes, verifies them, and only then unmarshals the Function request.

An empty Signing Key disables validation, so reject missing configuration at process startup instead of passing an empty value in production. `WithSignatureError` can customize the HTTP status and body, but it must not reveal secrets or request content.

## Auto-Registration

`server.WithAutoRegister()` creates a registrar from `appsdk.Options`. Standard Extension builders
declare their registration targets. A standalone Function defaults to `v1`; after AppStore and the
SDK publish another official contract, associate its implementation with
`appsdk.SystemVersion("v2")`. When a Function version has no Extension registration, the SDK adds a
`core` target for that version. An empty or unversioned app keeps the `core:v1` fallback.

For a custom client, cache, callback, or environment URL:

```go
server.WithAutoRegister(
  server.WithAutoRegisterClient(nativeClient),
  server.WithAutoRegisterTokenManager(tokenManager),
  server.WithAutoRegisterResult(func(results []native.AutoRegisterResult) {
    // Record success/failure without logging credentials.
  }),
)
```

Registration happens after the listener starts so AppStore can immediately call discovery. Retry settings are available through `WithAutoRegisterRetry`; do not build a separate token or registration loop around the server.

## Request Context

`WithRequestContext` can attach request-scoped observability values to the Go `context.Context`. It receives the raw request body, so do not copy the body into logs or traces. Channel Function context remains `appsdk.Context` and should be trusted only after signature verification.

## WAM Static Files

The Function route does not serve WAM assets automatically. Build the React WAM separately and mount its output under `${WAM_ENDPOINT}/${name}`, for example `/resource/wam/tutorial`. See [WAM Integration](WAM.md).

## Production Checklist

- Require App ID, App Secret, and Signing Key at startup.
- Keep signature verification enabled.
- Use an HTTPS public endpoint and set timeouts at the hosting layer.
- Use shared token cache storage for multiple replicas.
- Return structured Function errors without secrets.
- Test missing/invalid signatures and discovery before installation.
