# Concepts

A Channel app consists of a **server that executes Functions** and, when needed, a **web UI built as a WAM**. Extensions connect related Functions to standard Channel capabilities, while AppStore defines the call, registration, and authorization boundaries.

```text
Channel client → AppStore → signed PUT /functions/v1 → SDK validation and dispatch → Function handler
Function result → open WAM → WAM SDK → app Function or Channel native function
```

## Function

A Function is one typed operation executed by the app server. Its request envelope contains:

- `method`: the full name of the Function to call
- `params`: untrusted caller input
- `context`: caller, channel, language, authentication, and config data assembled by AppStore

A handler normally receives validated `context` and `params` and returns a `result`; failures return a structured `error`. Trust `context` only after verifying the request's `x-signature`.

In TypeScript, use `@Func`, `@InputSchema`, `@OutputSchema`, `@Ctx`, and `@Input`. The SDK publishes Zod schemas as JSON Schema and also validates input and output at runtime. In Go, `appsdk.Register` and `appsdk.MustRegister` derive schemas from Go structs and register typed handlers.

There are two kinds of Function:

- **Extension Function**: belongs to a standard Extension. For example, command's `metadata.getCommands` is exposed as `extension.command.metadata.getCommands`.
- **Standalone Function**: app-specific business behavior, such as `tutorial.open` or `orders.sync`. In TypeScript, put `@Func` on a provider without `@Extension`; in Go, use `appsdk.Register`.

AppStore discovers Function names and input/output schemas through `extension.core.function.getFunctions`. The SDK implements that discovery response, the `PUT /functions/:version` route, dispatch, and validation, so a new app does not need its own raw JSON-RPC router.

## Extension

An Extension is a **named, system-versioned capability contract** that declares related Functions and metadata as a Channel feature. It is not merely a folder or class grouping. AppStore uses a registered contract to expose commands, open widgets or custom tabs, deliver hooks, and connect OAuth or config flows.

Common Extensions include command, widget, custom tab, hook, OAuth, config, calendar, polling, commerce, order, WMS, and messaging. Each has standard Function names and schemas. Start with the [Extension guide](extensions.md), then check the [TypeScript Extension reference](../../reference/typescript/EXTENSIONS.md) and the typed helper for your language before implementing one.

The current recommended TypeScript path is:

```ts
@Extension({ name: "command", systemVersion: "v1" })
export class CommandExtension {
  @Func("metadata.getCommands")
  getCommands() {
    /* ... */
  }
}
```

Use `@Extension` only for an official Extension name supported by the SDK. Do not invent an Extension just to hold app-specific Functions; use standalone `@Func` methods instead. A decorated class must also be listed in the NestJS module's `providers` for discovery.

In Go, prefer typed builders such as `extension/command`, `extension/oauth`, and `extension/config`. Register a Function without a standard helper through `appsdk.Register`, and use the generic builder only when you actually need a separate Extension contract.

Auto-registration uses an app token to call `registerExtension(appId, extensionName, systemVersion)`. AppStore then calls the discovery Function at the Function Endpoint to read metadata and schemas. Registration success does not prove that handlers work, so test discovery and real Function calls separately.

## Schema and Context

An input schema constrains untrusted `params`; an output schema checks that the app returns the AppStore contract. For a standard Extension, reuse schemas exported by the SDK. Recreating a same-named DTO makes contract changes easy to miss.

Depending on the call surface, `context` can contain:

- `caller`: the `user`, `manager`, `system`, or `app` actor
- `channel`: identity of the Channel where the app is installed
- `user`, `userChat`, and `language`: user context when that flow provides it
- `authToken`: a provider access token decrypted and injected for an OAuth connection
- `config`: values and credentials stored through the config Extension for the current scope

Do not assume optional fields are always present. Validate them for the Function's execution surface. `ctx.authToken` is an external OAuth provider token, not a Channel App app or channel token.

## WAM

A WAM (Web App Module) is an app web UI opened inside a Channel client. When a command, widget, custom tab, or another Function returns an action result like the following, the client loads the `{name}` UI below the registered WAM Endpoint.

```json
{
  "type": "wam",
  "attributes": {
    "appId": "public-app-id",
    "name": "tutorial",
    "wamArgs": { "view": "summary" }
  }
}
```

Serve the built SPA from `${WAM_ENDPOINT}/${name}` and wrap the React root in `WamProvider`.

- `useWamData` / `useTypedWamData`: read `appId`, `channelId`, `managerId`, chat context, and `wamArgs`
- `useCallFunction`: call your own app Function through AppStore
- `useNativeFunction`: call a Channel native function allowed for the current surface and manager/user authorization
- `useWamSize`, `useWamClose`: control WAM size and closing

Read the [WAM guide](wam.md) for the complete React setup, runtime data, Function call, resize, and
close flow.

A WAM must not store or issue the App Secret, Signing Key, app token, or channel token. `wamArgs` is client-readable too, so never place secrets, access tokens, or raw customer data in it. For work performed as the app or bot, call the app server with `useCallFunction` and let the server use a channel token. Use `useNativeFunction` only for work performed by the current manager or user.

## Authentication, Signatures, and Tokens

Keep these credentials distinct:

| Value                      | Meaning                                                              | Storage                                                                 |
| -------------------------- | -------------------------------------------------------------------- | ----------------------------------------------------------------------- |
| App ID                     | Public app identifier                                                | May be used by the server and WAM                                       |
| App Secret                 | Long-lived secret used to issue app/channel token pairs              | Server secret manager only                                              |
| Signing Key                | Verifies `x-signature` on Function requests from AppStore            | Server secret manager only                                              |
| App token                  | Extension registration and app-scoped native operations              | Server cache                                                            |
| Channel token              | Server-side channel-scoped operations in an installed Channel        | Server cache, separated by channel                                      |
| Manager/User authorization | Native operations performed by the current Channel client user       | Managed by the WAM host runtime                                         |
| Provider OAuth token       | Calls to a connected external service                                | Injected into `ctx.authToken` when needed                               |
| Config credential          | API keys, `client_credentials`, per-shop secrets, and similar values | Stored by AppStore and injected through `ctx.config` and related fields |

Incoming Function authentication and outgoing native authentication are separate:

1. **Incoming request**: verify the HMAC-SHA256 `x-signature` over the exact raw request body with the hex-encoded Signing Key. Use `SignatureGuard` with NestJS `rawBody: true` in TypeScript, or `server.WithSignature` in Go. Never disable verification in production.
2. **Outgoing server request**: `TokenManager` uses the App Secret to issue and cache an app or channel token. It refreshes before expiry and deduplicates concurrent issue/refresh work. Do not call `issueToken` for every request.
3. **Outgoing WAM request**: the WAM SDK calls its host bridge. The Channel runtime decides manager/user authorization; the app server's `TokenManager` does not mint it.

### Token issuance details

Use `TokenManager` instead of repeatedly calling the low-level issuance APIs. Use the following
contract when diagnosing the transport or intentionally managing tokens yourself.

- `issueToken` and `refreshToken` share a limit of **10 calls per 30 minutes per app**. Cache the
  access/refresh token pair instead of issuing a token for every request.
- Omitting `channelId` from `issueToken` creates an app token for app-scoped operations such as
  Extension registration.
- Supplying the `channelId` of an installed Channel creates a channel token for server-side
  operations in that Channel. The operation still requires installation and the selected permission.
- The important result fields are `accessToken`, `refreshToken`, and `expiresIn` in seconds. Send
  the current access token in the `x-access-token` header for Native Function requests.
- Channel permissions restrict operations performed by the server with a channel token.
  Manager/User permissions and authorization are enforced by the WAM host from the current user and
  surface.

Read the [TypeScript authentication and token reference](../../reference/typescript/AUTH-AND-TOKENS.md)
and [Go authentication and token reference](../../reference/go/AUTH-AND-TOKENS.md) for exact APIs
and custom cache storage.

The default token cache is in memory and suitable for one process. For multiple replicas, implement the SDK cache interface with shared storage such as Redis or a database so replicas share token pairs. In-flight deduplication is process-local; add storage-side locking if strict cross-replica refresh coordination is required. Never log access tokens, refresh tokens, provider tokens, or credentials.

Use the OAuth Extension and `ctx.authToken` for an OAuth Authorization Code flow. `client_credentials`, API keys, and per-shop credentials are not user-redirect OAuth; store them through the Config Extension and use them server-side.

## Native Function and Endpoints

A native Function is the opposite call direction from an app Function: an app server or WAM asks Channel to perform a capability through AppStore.

- Server: TypeScript `NativeFunctionClient` or Go `native.Client`
- Token lifecycle: TypeScript or Go `TokenManager`
- WAM: `useNativeFunction`

Do not assume every language has the same typed wrapper. Check [Go feature parity](../../reference/go-feature-parity.md). When a wrapper is missing, isolate the protocol call in a small transport adapter and test its method and request/response contract.

Register endpoint roots in the developer portal, without a system version or WAM name:

- Function Endpoint: `https://app.example.com/functions`
- Actual Function call: `PUT https://app.example.com/functions/v1`
- WAM Endpoint: `https://app.example.com/resource/wam`
- Actual WAM UI: `https://app.example.com/resource/wam/tutorial`

## Proto

`proto/` is the shared wire-contract source for TypeScript and Go. App developers normally use each language SDK's decorators, builders, schemas, and types instead of generated proto code. When documentation or an example disagrees with a public export, follow the public export and schema implementation.

Continue with [Function registration](functions.md), the [Command guide](extensions/command.md), the
[WAM guide](wam.md), the [Extension guide](extensions.md), and finally the
[production readiness guide](app-development.md). For runnable code, see the
[TypeScript tutorial](https://github.com/channel-io/app-tutorial-ts) and
[Go tutorial](https://github.com/channel-io/app-tutorial).
