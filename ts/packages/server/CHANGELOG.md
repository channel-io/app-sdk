# @channel.io/app-sdk-server

## 0.21.0

### Minor Changes

- 48e466b: Allow NestJS apps to declare the `userAuthorization` Extension with `@Extension`.
- aac3364: Remove the extension-specific `registerAlfTasks` and `registerAppNotebooks` SDK APIs. Registering or refreshing ALF Task and Notebook extensions now uses the common `registerExtension` flow.

### Patch Changes

- d7c35d4: Defer datasource table authorization and dialect-specific syntax validation to AppStore and the configured database provider while preserving single-statement read-only guards.
- fb018c8: Keep recursive CTE declarations at the provider's top level when applying datasource row limits.
- Updated dependencies [aac3364]
  - @channel.io/app-sdk-core@0.21.0

## 0.20.1

### Patch Changes

- 2ca28c1: Add App Token-only paginated OAuth manager target discovery and a typed server client method.
- Updated dependencies [7632db8]
- Updated dependencies [2ca28c1]
  - @channel.io/app-sdk-core@0.20.1

## 0.20.0

### Minor Changes

- 5aeeb15: Allow functions to remain directly invokable while being omitted from public and test function discovery.

### Patch Changes

- @channel.io/app-sdk-core@0.20.0

## 0.19.1

### Patch Changes

- 2a83a7e: Harden token management for short-lived tokens and add optional storage-backed locking for cross-replica issue and refresh deduplication.
- 956cc26: Allow read-only datasource queries to contain SQL comments and literals while preserving write and multi-statement guards.
  - @channel.io/app-sdk-core@0.19.1

## 0.19.0

### Patch Changes

- Updated dependencies [b3b2ed3]
- Updated dependencies [56e6092]
  - @channel.io/app-sdk-core@0.19.0

## 0.18.2

### Patch Changes

- Updated dependencies [f00ae2b]
  - @channel.io/app-sdk-core@0.18.2

## 0.18.1

### Patch Changes

- Updated dependencies [6f0574d]
  - @channel.io/app-sdk-core@0.18.1

## 0.18.0

### Patch Changes

- 6dfd90d: Generate a current secure TypeScript starter, add first-class Messaging helpers, and verify WAM UI
  against Bezier React 4.0.0-next.14.
- Updated dependencies [6dfd90d]
- Updated dependencies [3cd63f2]
  - @channel.io/app-sdk-core@0.18.0

## 0.17.2

### Patch Changes

- 969c5bd: Recognize function input Zod errors across CommonJS and ESM module boundaries so validation failures consistently return HTTP 400.
  - @channel.io/app-sdk-core@0.17.2

## 0.17.1

### Patch Changes

- 68fd2df: Return HTTP 400 responses for invalid function inputs instead of treating Zod validation failures as internal server errors.
  - @channel.io/app-sdk-core@0.17.1

## 0.17.2

### Patch Changes

- Updated dependencies [f5ca25f]
  - @channel.io/app-sdk-core@0.17.2

## 0.16.5

### Patch Changes

- Updated dependencies [5e26385]
  - @channel.io/app-sdk-core@0.16.5

## 0.16.4

### Patch Changes

- Updated dependencies [180d31e]
- Updated dependencies [eb004ca]
  - @channel.io/app-sdk-core@0.16.4

## 0.16.3

### Patch Changes

- Updated dependencies [2b756e6]
  - @channel.io/app-sdk-core@0.16.3

## 0.16.2

### Patch Changes

- a863969: Harden datasource parsing and signature payload construction for large public inputs.
- Updated dependencies [1fe68d4]
  - @channel.io/app-sdk-core@0.16.2

## 0.16.1

### Patch Changes

- Updated dependencies [43c132f]
  - @channel.io/app-sdk-core@0.16.1

## 0.16.0

### Minor Changes

- 825e4bd: Replace the Store extension's runtime-oriented `profile` response with the persisted App Store metadata contract. `getStoreProfile` now returns `relatedAppIds` and localized `i18nMap` content (`images`, `intro`, and `faqs`) directly.

### Patch Changes

- Updated dependencies [825e4bd]
  - @channel.io/app-sdk-core@0.16.0

## 0.15.8

### Patch Changes

- 18aaa89: Add notebook extension contracts and native app notebook helpers.
- Updated dependencies [18aaa89]
  - @channel.io/app-sdk-core@0.15.8

## 0.15.7

### Patch Changes

- c5c6735: Map datasource INT256 and UINT256 columns to Arrow Decimal256.
  - @channel.io/app-sdk-core@0.15.7

## 0.15.6

### Patch Changes

- 3b2f92d: Split datasource Arrow IPC messages into protocol dataHeader/dataBody frames for gRPC query streams.
- Updated dependencies [e894a35]
  - @channel.io/app-sdk-core@0.15.6

## 0.15.5

### Patch Changes

- d69aabf: Add typed AppDataTable native function contracts, reusable schemas, and server client wrappers.
- Updated dependencies [d69aabf]
  - @channel.io/app-sdk-core@0.15.5

## 0.15.4

### Patch Changes

- 4d45a8d: Add datasource gRPC access-token metadata and HMAC signature verification helpers.
  - @channel.io/app-sdk-core@0.15.4

## 0.15.3

### Patch Changes

- Updated dependencies [5add83e]
  - @channel.io/app-sdk-core@0.15.3

## 0.15.2

### Patch Changes

- c417252: Expose datasource gRPC route metadata and routed ExecuteQuery handler helpers.
  - @channel.io/app-sdk-core@0.15.2

## 0.15.1

### Patch Changes

- 95bd9a3: Retry extension auto-registration with exponential backoff so transient App Store callbacks during app startup do not fail registration.
- a8086c0: Expose datasource ExecuteQuery gRPC metadata and app identity context to TypeScript handlers.
  - @channel.io/app-sdk-core@0.15.1

## 0.15.0

### Minor Changes

- b5c8423: Add optional PostgreSQL and BigQuery Storage datasource executors that stream query results as Arrow IPC chunks without materializing the full result set.

### Patch Changes

- @channel.io/app-sdk-core@0.15.0

## 0.14.0

### Minor Changes

- 77e681f: Add datasource JSON-RPC metadata helpers, common proto metadata DTOs, and datasource gRPC query helpers for BigQuery and PostgreSQL app servers.

### Patch Changes

- Updated dependencies [77e681f]
  - @channel.io/app-sdk-core@0.14.0

## 0.13.1

### Patch Changes

- e032812: Add polling extension schemas, interfaces, decorator support, documentation, and CLI scaffold with required target channel resolver support.
- Updated dependencies [e032812]
  - @channel.io/app-sdk-core@0.13.1

## 0.13.0

### Minor Changes

- 3c0a968: Add test-only app function support through `TestFunc`, `ChannelApp.testFunction`, and `extension.core.function.getTestFunctions`.

### Patch Changes

- Updated dependencies [3c0a968]
  - @channel.io/app-sdk-core@0.13.0

## 0.12.1

### Patch Changes

- Updated dependencies [79a68d9]
  - @channel.io/app-sdk-core@0.12.1

## 0.12.0

### Patch Changes

- Updated dependencies [f343d9a]
  - @channel.io/app-sdk-core@0.12.0

## 0.11.1

### Patch Changes

- 639d45e: Normalize snake_case params to camelCase during messaging extension input validation and accept protobuf JSON numeric strings in messaging schemas.
- Updated dependencies [639d45e]
  - @channel.io/app-sdk-core@0.11.1

## 0.11.0

### Minor Changes

- f60c575: Add Store extension authoring schemas, helper API, decorator name support, and documentation for self-serve AppStore profile content.

### Patch Changes

- Updated dependencies [f60c575]
- Updated dependencies [60883af]
  - @channel.io/app-sdk-core@0.11.0

## 0.10.0

### Minor Changes

- 711c51a: Add typed function call errors that serialize to JSON-RPC error responses.

### Patch Changes

- Updated dependencies [711c51a]
  - @channel.io/app-sdk-core@0.10.0

## 0.9.1

### Patch Changes

- Updated dependencies [7496ae4]
  - @channel.io/app-sdk-core@0.9.1

## 0.9.0

### Patch Changes

- Updated dependencies [8e0736f]
- Updated dependencies [0ef1e25]
  - @channel.io/app-sdk-core@0.9.0

## 0.8.0

### Minor Changes

- fb345ff: Add Messaging extension schemas and typed Native Function contracts.

  Expose `NativeFunctionClient` and `TokenManager` from `ChannelAppModule` so NestJS apps can reuse SDK-managed native function tokens. `TokenManager` now issues app/channel tokens through AppStore native functions, caches tokens, refreshes them with an expiry buffer, and falls back to issuing a new token when refresh fails.

  Deprecate the legacy `AppStoreClient` and `ChannelAppSimpleService` APIs. They are unused by the SDK and are scheduled for removal in the next minor release.

### Patch Changes

- Updated dependencies [fb345ff]
  - @channel.io/app-sdk-core@0.8.0

## 0.7.3

### Patch Changes

- Updated dependencies [cb27802]
  - @channel.io/app-sdk-core@0.7.3

## 0.7.2

### Patch Changes

- 46f0eca: Add transient and media storage class support to config extension schemas for draft-only and media-backed setup inputs.
- Updated dependencies [46f0eca]
  - @channel.io/app-sdk-core@0.7.2

## 0.7.1

### Patch Changes

- 6f80f9b: Add WMS supported commerce metadata function contracts.
- Updated dependencies [6f80f9b]
  - @channel.io/app-sdk-core@0.7.1

## 0.7.0

### Minor Changes

- 63114c2: Add the first-class `config` extension surface, including schema exports, interfaces, decorator support, and `context.config` for runtime handlers and tests.

  Align the config schema with AppStore's setup WAM contract and mark the legacy API key extension as deprecated for new setup surfaces.

### Patch Changes

- Updated dependencies [63114c2]
  - @channel.io/app-sdk-core@0.7.0

## 0.6.12

### Patch Changes

- Updated dependencies [58b6f4d]
  - @channel.io/app-sdk-core@0.6.12

## 0.6.11

### Patch Changes

- Updated dependencies [a4bb85f]
  - @channel.io/app-sdk-core@0.6.11

## 0.6.10

### Patch Changes

- Updated dependencies [3f72725]
  - @channel.io/app-sdk-core@0.6.10

## 0.6.9

### Patch Changes

- d0ca565: Redact sensitive values from debug logs in the server SDK.

  Native function and NestJS debug logging now masks secrets, access tokens,
  refresh tokens, auth tokens, and api credentials before printing request or
  response payloads. The native client docs also clarify that TokenManager should
  be used when callers need built-in token caching and refresh behavior.
  - @channel.io/app-sdk-core@0.6.9

## 0.6.8

### Patch Changes

- 4abf7b5: Add `messaging` back to ExtensionName alongside `messenger` for backward compatibility with legacy inbox messaging extensions.
- Updated dependencies [4abf7b5]
  - @channel.io/app-sdk-core@0.6.8

## 0.6.7

### Patch Changes

- c0fe9be: Rename extension name `messaging` to `messenger` to match the app-store extension definition.
- Updated dependencies [c0fe9be]
  - @channel.io/app-sdk-core@0.6.7

## 0.6.6

### Patch Changes

- Updated dependencies [6220b54]
  - @channel.io/app-sdk-core@0.6.6

## 0.6.5

### Patch Changes

- Updated dependencies [8f520b2]
  - @channel.io/app-sdk-core@0.6.5

## 0.6.4

### Patch Changes

- 52940de: Add first-class hook extension metadata support with `@Extension({ name: "hook" })`,
  `GetHooksOutputSchema`, `HookExtensionInterface`, and CLI/docs updates for the
  flat AppStore hook registration spec.
- Updated dependencies [52940de]
  - @channel.io/app-sdk-core@0.6.4

## 0.6.3

### Patch Changes

- 9c3deb7: Allow `@Extension({ name: "wms" })` so the published server SDK matches the WMS interfaces and function names already exported by `@channel.io/app-sdk-core`.
  - @channel.io/app-sdk-core@0.6.3

## Unreleased

### Patch Changes

- Allow `@Extension({ name: "wms" })` now that `@channel.io/app-sdk-core` ships WMS extension
  interfaces and function names.

## 0.6.2

### Patch Changes

- 0c8ad81: Add messaging to SDK extension names
  - @channel.io/app-sdk-core@0.6.2

## 0.6.1

### Patch Changes

- b1919ce: Remove the legacy unversioned function endpoint and keep app function handling on versioned `/functions/:version` routes only.
  - @channel.io/app-sdk-core@0.6.1

## 0.6.0

### Patch Changes

- Updated dependencies [e707ff7]
  - @channel.io/app-sdk-core@0.6.0

## 0.5.0

### Minor Changes

- aa9a650: Remove the legacy `registerCommands` native client API and move command registration to
  `registerExtension("command", "v1")` with `extension.command.metadata.getCommands`.

  Widget and custom tab SDK surfaces now match AppStore's metadata-driven registration
  flow too. Widget extensions use `extension.widget.metadata.getWidgets`, custom tab
  extensions use `extension.customtab.metadata.getCustomTabs`, and both metadata
  responses default `systemVersion: "v1"` when omitted. Widget/custom tab schemas,
  interfaces, and CLI scaffolds were updated to point at metadata discovery plus
  plain app functions referenced by `actionFunctionName`.

### Patch Changes

- Updated dependencies [aa9a650]
  - @channel.io/app-sdk-core@0.5.0

## 0.4.2

### Patch Changes

- Updated dependencies [cdc5ff3]
  - @channel.io/app-sdk-core@0.4.2

## 0.4.1

### Patch Changes

- Updated dependencies [1c404bb]
  - @channel.io/app-sdk-core@0.4.1

## 0.4.0

### Minor Changes

- 1053ead: Unify context types and improve server infrastructure
  - Remove `ExtensionContext` and `FunctionContext`; unify into single `Context` type aligned with Go `ChannelContext`
  - Add `apiCredentials` to `Context`
  - Change `ValidateCredentialsInput` from wrapped object to flat record; remove `ValidateCredentialsInputSchema`
  - Update `ApiKey` extension schema and CLI `add` command
  - Improve `NativeFunctionClient` design and add token caching to `ChannelAppService`
  - Fix extension registration timing based on `HttpAdapterHost`

### Patch Changes

- Updated dependencies [1053ead]
  - @channel.io/app-sdk-core@0.4.0

## Unreleased

### Breaking Changes

- **FunctionContext 제거**: `FunctionContext` 삭제, `Context` (`@channel.io/app-sdk-core`) 직접 사용
  - `import type { FunctionContext }` → `import type { Context } from "@channel.io/app-sdk-core"`
- **NativeFunctionClient config**: `appId`, `appSecret`을 config에서 제거. 각 메서드에 명시적 인자로 전달 (pure HTTP transport layer)

### Features

- **토큰 캐싱**: `ChannelAppService`에 accessToken 캐싱/리프레시 로직 추가 (5분 버퍼, refresh 우선 전략)
- **Extension 등록 타이밍 수정**: `onApplicationBootstrap` + `server.once("listening")`으로 HTTP 서버 준비 후 등록
- **디버그 로그 강화**: debug 모드에서 함수 호출 시 request 전체와 output 로그 출력
- **useFactory 타입 개선**: `ChannelAppModuleAsyncOptions.useFactory` 인자를 `any[]`로 변경하여 `as any` 캐스트 불필요

## 0.3.1

### Patch Changes

- b8a33ba: Add "order" to valid SDK extension names
  - @channel.io/app-sdk-core@0.3.1

## 0.3.0

### Minor Changes

- ### Bug Fixes
  - **SignatureGuard**: Fix raw body handling for HMAC signature verification

  ### Features
  - **TokenManager**: TTL-based token caching with auto-refresh, thundering herd prevention, app/channel/manager/user token support
  - **MessageBuilder**: Chaining API for message composition with typed blocks, buttons, files, and mention() helper
  - **Native Function Types**: Typed wrappers for registerExtension, registerCommands, registerAlfTasks, getAlfTaskVersions
  - **ProxyAPI Types**: Typed wrappers for writeGroupMessage, getManager, searchManagers, getUser, and 11 more Channel API functions
  - **Core Extension**: Auto-register "core" extension for apps without @Extension decorators
  - **CJS Compatibility**: Add "default" export condition for CommonJS consumers

### Patch Changes

- cfb8641: Add "default" condition to package exports for CJS compatibility

  Generated NestJS apps compile to CommonJS (`"module": "commonjs"`), but the SDK
  only had `"import"` condition in exports, causing `ERR_PACKAGE_PATH_NOT_EXPORTED`
  at runtime. Adding `"default"` as a fallback condition resolves this.

- Updated dependencies [cfb8641]
- Updated dependencies
  - @channel.io/app-sdk-core@0.3.0

## 0.2.0

### Minor Changes

- 8c75548: Allow standalone @Func registration without @Extension decorator. Custom business functions can now be registered with @Func alone, while @Extension is restricted to SDK interface names (oauth, apikey, calendar, messenger, command, widget, customtab, commerce, alfTask).

### Patch Changes

- @channel.io/app-sdk-core@0.2.0

## 0.1.1

### Patch Changes

- 9e5680f: Add "default" condition to package exports for CJS compatibility

  Generated NestJS apps compile to CommonJS (`"module": "commonjs"`), but the SDK
  only had `"import"` condition in exports, causing `ERR_PACKAGE_PATH_NOT_EXPORTED`
  at runtime. Adding `"default"` as a fallback condition resolves this.

- Updated dependencies [9e5680f]
  - @channel.io/app-sdk-core@0.1.1

## 0.1.0

### Minor Changes

- Initial release of Channel.io App SDK packages

### Patch Changes

- Updated dependencies
  - @channel.io/app-sdk-core@0.1.0
