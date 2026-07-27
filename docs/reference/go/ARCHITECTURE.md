# Go SDK Architecture

## Packages

| Package         | Responsibility                                                                       |
| --------------- | ------------------------------------------------------------------------------------ |
| `appsdk`        | App registry, Function request/response types, typed handlers, discovery, and errors |
| `schema`        | JSON Schema generation, explicit overrides, and schema patches                       |
| `extension`     | Generic Extension builder and shared helpers                                         |
| `extension/*`   | Typed builders, names, DTOs, and validators for standard Extension families          |
| `server`        | Default Gin-backed server with the smallest public API                               |
| `server/gin`    | Handler, route, existing-engine mounting, signatures, and auto-registration options  |
| `native`        | AppStore client, app/channel token manager, cache interface, and auto-registration   |
| `testkit`       | Function invocation and discovery helpers for tests                                  |
| `datasource/*`  | DataSource metadata, gRPC query server, and optional query executors                 |

## Request Lifecycle

```text
Channel client or system
  → AppStore
  → signed PUT /functions/:version
  → server/gin verifies raw-body HMAC
  → appsdk.App.HandleRequest
  → typed Function handler
  → FunctionResponse
```

`appsdk.FunctionRequest` contains `Method`, `Params`, `Context`, and optional `SystemVersion`. The server route reads the exact raw body for signature verification before decoding JSON. `appsdk.App` handles discovery methods, resolves the registered Function, decodes typed input, calls the handler, and maps the result or error into the public response envelope.

## Function Discovery

`appsdk.App` owns an ordered Function registry. It answers:

- `extension.core.function.getFunctions`
- `extension.core.function.getTestFunctions`

The response publishes each Function's full name, description, input schema, and optional output schema. Normal Function calls and discovery use the same registry, so do not maintain a second metadata list.

## Extension Discovery And Registration

Go does not scan decorators. Calling `app.Use(builder)` lets the builder:

1. declare its Extension name and system version;
2. register Extension Functions with canonical full names;
3. register standalone Functions referenced by metadata.

`server.WithAutoRegister()` creates an `native.AutoRegistrar`. It obtains a cached app token, calls `registerExtension` for every declared Extension, and falls back to the `core:v1` registration when the app contains only standalone Functions.

## Trust Boundaries

- **Inbound Function call**: verify `x-signature` with the Signing Key before trusting `Context`.
- **Server native call**: use an app or channel token from `native.TokenManager`.
- **External provider call**: use OAuth/config credentials injected in `appsdk.Context`, not a Channel App token.
- **WAM call**: the Channel host owns manager/user authorization; the Go server never mints it.

## WAM Boundary

The Go SDK builds the server result that opens a WAM, but the browser UI uses `@channel.io/app-sdk-wam`. Keep App Secret, Signing Key, app/channel tokens, and provider credentials on the server. See [WAM Integration](WAM.md).

## Source Priority

When documentation and code disagree, inspect in this order:

1. exported APIs under `go/appsdk`, `go/server`, `go/native`, and `go/extension`;
2. family-specific `go/extension/*` packages;
3. package tests and `go/testkit`;
4. this reference and the runnable Go tutorial.
