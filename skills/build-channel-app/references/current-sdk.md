# Current SDK Contract

Check registries before pinning versions. Values verified on 2026-07-22:

| Surface           | Package/module                     | Verified release |
| ----------------- | ---------------------------------- | ---------------- |
| TypeScript server | `@channel.io/app-sdk-server`       | `0.17.2`         |
| TypeScript core   | `@channel.io/app-sdk-core`         | `0.17.2`         |
| React WAM         | `@channel.io/app-sdk-wam`          | `0.17.2`         |
| WAM UI            | `@channel.io/app-sdk-wam-ui`       | `0.4.0`          |
| Go                | `github.com/channel-io/app-sdk/go` | `v0.14.0`        |

## Source priority

1. Public package exports and types.
2. Extension schemas and interfaces.
3. SDK reference and locale guides.
4. Current TypeScript and Go tutorial repositories.

## Current defaults

- AppStore base URL: `https://app-store.channel.io`
- Function route: `PUT /functions/:version`
- Function Endpoint setting: the `/functions` root
- Ingress compatibility: map bare `PUT /functions` calls to the default `v1` SDK handler without
  changing the raw body or bypassing signature verification
- WAM Endpoint setting: the root below which each WAM name is served
- Registration: `registerExtension` plus metadata functions
- TypeScript function context type: `Context`
- Server token manager scopes: app and channel

## Concept boundaries

- A Function is one typed server operation. The request envelope contains `method`, `params`, and `context`; handlers normally receive validated context and params.
- A TypeScript Extension is an official named, system-versioned capability declared with `@Extension`. Its relative `@Func` names are exposed as `extension.{extensionName}.{relativeName}`.
- Register app-specific behavior as standalone `@Func` methods without `@Extension`. In Go, use `appsdk.Register` or `appsdk.MustRegister`.
- AppStore discovers names and schemas through `extension.core.function.getFunctions`; the SDK owns the versioned route and dispatch.
- WAM is client UI loaded from `${WAM_ENDPOINT}/${name}`. It uses the host bridge through `@channel.io/app-sdk-wam` and must not contain server secrets.

## Authentication boundaries

- Verify inbound Function requests with the raw-body HMAC `x-signature` and Signing Key.
- Use `TokenManager` for server-side app/channel tokens; use shared cache storage across multiple replicas.
- Manager/user native authorization belongs to the Channel WAM runtime and is not minted by the server token manager.
- `ctx.authToken` is a connected external OAuth provider token.
- API keys, `client_credentials`, and per-shop secrets belong in config-backed credentials, not OAuth Authorization Code flows.

## Hosting contract

- Generated TypeScript apps should use `ChannelAppModule` and lock the resolved SDK version before release.
- The runtime path is `/functions/v1`; the AppStore Function Endpoint remains the `/functions`
  root. If callers use the bare root, route it to the same verified default-version handler.
- A hosting platform may own endpoint synchronization and extension registration. Preserve any
  supplied `APP_STORE_URL` and registration settings.
- Do not copy builder-only preview calls into a WAM that runs in the Channel client; use the public WAM SDK hooks.

## Feature choice

- TypeScript: use `ChannelAppModule`, decorators, `TokenManager`, `NativeFunctionClient`, and WAM hooks.
- Go: use `appsdk.App`, extension builders, `server` or `server/gin`, and `native.TokenManager`.
- Check `docs/reference/go-feature-parity.md` before using a TypeScript native convenience API in Go.
- Prefer a named TypeScript family schema. When a family has no named Function-level schema export,
  resolve the full canonical Function name from `extensionFunctionSchemaDefinitions` and pass its
  Zod `input`/`output` to the decorators; do not hand-wave discovery schemas.
- Messaging uses `messaging:v1`; use the TypeScript `Messaging` decorators or Go messaging builder
  and complete any additional product setup explicitly in AppStore.
