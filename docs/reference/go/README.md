# Go SDK Reference

The Go SDK covers the server-side Channel app responsibilities provided by the TypeScript SDK, using Go builders, generics, structs, and Gin instead of decorators, Zod, and NestJS.

Verified release: `github.com/channel-io/app-sdk/go v0.14.0`, requiring Go 1.25.

## Reference Map

- [Architecture](ARCHITECTURE.md): packages, request lifecycle, discovery, and trust boundaries
- [Functions and Schemas](FUNCTIONS.md): typed handlers, schemas, errors, discovery, and tests
- [Server and Routing](SERVER.md): default server, Gin mounting, signatures, and auto-registration
- [Authentication and Tokens](AUTH-AND-TOKENS.md): credentials, token cache, refresh, and WAM authorization
- [Extensions](EXTENSIONS.md): typed builders, naming, registration, and supported families
- [Native Functions](NATIVE.md): token, registration, data, and app-function clients
- [WAM Integration](WAM.md): Go action results with the shared React WAM SDK
- [Feature Parity](../go-feature-parity.md): current differences from the TypeScript SDK
- [Extensions](./EXTENSIONS.md): builders, schemas, Messaging, WMS, DataSource, and advanced patterns

## TypeScript To Go Mapping

| Responsibility      | TypeScript                     | Go                                        |
| ------------------- | ------------------------------ | ----------------------------------------- |
| App registry        | `ChannelAppModule` discovery   | `appsdk.App`                              |
| Typed Function      | `@Func` with schema decorators | `appsdk.Register` / `appsdk.MustRegister` |
| Standard Extension  | `@Extension`                   | `extension/*` builder                     |
| Input/output schema | Zod                            | Go struct/schema tags or explicit schema  |
| Function route      | NestJS controller              | `server` or `server/gin`                  |
| Request signature   | `SignatureGuard`               | `server.WithSignature`                    |
| App/channel token   | `TokenManager`                 | `native.TokenManager`                     |
| Native client       | `NativeFunctionClient`         | `native.Client`                           |
| Test helper         | SDK testing utilities          | `testkit`                                 |
| WAM frontend        | `@channel.io/app-sdk-wam`      | Same TypeScript/React package             |

The public Go package source is the contract. When this reference and an example disagree, follow exported Go APIs and tests first, then this reference and the [Go tutorial](https://github.com/channel-io/app-tutorial).
