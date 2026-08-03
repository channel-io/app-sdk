# @channel.io/app-sdk-core

## 0.19.0

### Minor Changes

- b3b2ed3: Add the shared `needsUserInput` Function result, question, option, and answer schemas.

### Patch Changes

- 56e6092: Add versioned app-function WAM render snapshot contracts and a compatibility hook for legacy public snapshots.

## 0.18.2

### Patch Changes

- f00ae2b: Add optional datasource query authorization schemas, types, and registration helpers.

## 0.18.1

### Patch Changes

- 6f0574d: Add manager-scoped polling metadata, target schemas, and function helpers.

## 0.18.0

### Minor Changes

- 3cd63f2: Rename commerce and WMS claim functions to verb-first names.

  `extension.commerce.order.cancelRequestOrder`, `returnRequestOrder`, `returnAcceptOrder`, and
  `exchangeRequestOrder` become `requestCancelOrder`, `requestReturnOrder`, `acceptReturnOrder`, and
  `requestExchangeOrder`. The WMS order group follows the same rule, and its restore functions become
  `restoreCanceledOrder`, `restoreReturnedOrder`, and `restoreExchangedOrder`.

  The matching `getAppConfigs` capability fields are renamed the same way (for example
  `cancelRequestOrderOptions` becomes `requestCancelOrderOptions`), and the
  `CommerceReturnAcceptOrderInput` proto message becomes `CommerceAcceptReturnOrderInput`. Proto field
  numbers are unchanged, so binary payloads stay compatible; JSON keys and generated type names change.

  This is a breaking rename. Apps must update their registered function names to match the extension
  definitions in the app store, otherwise function discovery will not resolve them.

### Patch Changes

- 6dfd90d: Generate a current secure TypeScript starter, add first-class Messaging helpers, and verify WAM UI
  against Bezier React 4.0.0-next.14.

## 0.17.2

## 0.17.1

## 0.17.2

### Minor Changes

- f5ca25f: Add typed Hook Extension metadata for app-level public webhook ingress.

## 0.16.5

### Patch Changes

- 5e26385: Document the canonical Cafe24 and Naver Smart Store commerce-key contracts used by WMS extensions.

## 0.16.4

### Patch Changes

- 180d31e: Add optional datasource table manager access metadata with `all` and `owner` values.
- eb004ca: Add optional OAuth token request field and nested token response path mappings while preserving the existing OAuth defaults.

## 0.16.3

### Patch Changes

- 2b756e6: Add multi-config schema metadata for keyed config collections and optional key resolver functions.

## 0.16.2

### Patch Changes

- 1fe68d4: Support `config.saved` and `config.deleted` hook metadata registrations.

## 0.16.1

### Patch Changes

- 43c132f: Accept opaque relative Store Profile media keys without requiring a `pub-file/` prefix.

## 0.16.0

### Minor Changes

- 825e4bd: Replace the Store extension's runtime-oriented `profile` response with the persisted App Store metadata contract. `getStoreProfile` now returns `relatedAppIds` and localized `i18nMap` content (`images`, `intro`, and `faqs`) directly.

## 0.15.8

### Patch Changes

- 18aaa89: Add notebook extension contracts and native app notebook helpers.

## 0.15.7

## 0.15.6

### Patch Changes

- e894a35: Add the mailRelay v1 extension contract schemas, function names, and public TypeScript types.

## 0.15.5

### Patch Changes

- d69aabf: Add typed AppDataTable native function contracts, reusable schemas, and server client wrappers.

## 0.15.4

## 0.15.3

### Patch Changes

- 5add83e: Enforce proto-backed core DTO declarations and add extension schema parity coverage helpers.

## 0.15.2

## 0.15.1

## 0.15.0

## 0.14.0

### Minor Changes

- 77e681f: Add datasource JSON-RPC metadata helpers, common proto metadata DTOs, and datasource gRPC query helpers for BigQuery and PostgreSQL app servers.

## 0.13.1

### Patch Changes

- e032812: Add polling extension schemas, interfaces, decorator support, documentation, and CLI scaffold with required target channel resolver support.

## 0.13.0

### Minor Changes

- 3c0a968: Add test-only app function support through `TestFunc`, `ChannelApp.testFunction`, and `extension.core.function.getTestFunctions`.

## 0.12.1

### Patch Changes

- 79a68d9: Accept dropwizard messaging enum values for email writing type and initial, missed, and queued user chat states.

## 0.12.0

### Minor Changes

- f343d9a: Add the optional `inbox.onMediumUserChatClosed` messaging extension callback.

## 0.11.1

### Patch Changes

- 639d45e: Normalize snake_case params to camelCase during messaging extension input validation and accept protobuf JSON numeric strings in messaging schemas.

## 0.11.0

### Minor Changes

- f60c575: Add Store extension authoring schemas, helper API, decorator name support, and documentation for self-serve AppStore profile content.

### Patch Changes

- 60883af: Document Cafe24 and Naver SmartStore WMS commerce key formats.

## 0.10.0

### Minor Changes

- 711c51a: Add typed function call errors that serialize to JSON-RPC error responses.

## 0.9.1

### Patch Changes

- 7496ae4: Add WMS getShopId commerce lookup metadata.

## 0.9.0

### Minor Changes

- 8e0736f: Add config field `choicesSource`, draft `choicesPatch`, OAuth additional-parameter mappings, and OAuth refresh/token request metadata so setup WAMs can populate select-like fields and pass config-owned tenant identifiers into OAuth flows.
- 0ef1e25: Add SSOT-aligned OAuth extension schemas for `metadata.getAuthConfig`, including `authType`, `authScope`, provider metadata, and validation input helpers while keeping provider parameter-case and token request metadata available.

## 0.8.0

### Minor Changes

- fb345ff: Add Messaging extension schemas and typed Native Function contracts.

  Expose `NativeFunctionClient` and `TokenManager` from `ChannelAppModule` so NestJS apps can reuse SDK-managed native function tokens. `TokenManager` now issues app/channel tokens through AppStore native functions, caches tokens, refreshes them with an expiry buffer, and falls back to issuing a new token when refresh fails.

  Deprecate the legacy `AppStoreClient` and `ChannelAppSimpleService` APIs. They are unused by the SDK and are scheduled for removal in the next minor release.

## 0.7.3

### Patch Changes

- cb27802: Add `resolvesTo` metadata for config fields so transient inputs can persist derived config or credential values.

## 0.7.2

### Patch Changes

- 46f0eca: Add transient and media storage class support to config extension schemas for draft-only and media-backed setup inputs.

## 0.7.1

### Patch Changes

- 6f80f9b: Add WMS supported commerce metadata function contracts.

## 0.7.0

### Minor Changes

- 63114c2: Add the first-class `config` extension surface, including schema exports, interfaces, decorator support, and `context.config` for runtime handlers and tests.

  Align the config schema with AppStore's setup WAM contract and mark the legacy API key extension as deprecated for new setup surfaces.

## 0.6.12

### Patch Changes

- 58b6f4d: WMS 확장 타입과 Zod 스키마를 AppStore SSOT 기준에 맞췄습니다. 주문 상품의 선택 필드, nullable `getShopId.shopId`, optional `message`를 반영하고, 취소/반품/교환 입력은 `orderId`를 우선 사용하되 legacy `orderIds` 호환을 유지합니다. 또한 WMS 함수 계약에 사용할 공통 Zod 스키마를 export합니다.

## 0.6.11

### Patch Changes

- a4bb85f: Add optional `parameterCase` (`"snake"` | `"camel"`) field to `OAuthConfigSchema` for providers that require camelCase OAuth parameters (e.g. Imweb). Defaults to snake.

## 0.6.10

### Patch Changes

- 3f72725: Fix the exported OAuth function-name constants to match the current AppStore contract and add in-repo implementation guides for extensions, auth/token flow, and WAM usage.

## 0.6.9

## 0.6.8

### Patch Changes

- 4abf7b5: Add `messaging` back to ExtensionName alongside `messenger` for backward compatibility with legacy inbox messaging extensions.

## 0.6.7

### Patch Changes

- c0fe9be: Rename extension name `messaging` to `messenger` to match the app-store extension definition.

## 0.6.6

### Patch Changes

- 6220b54: Remove the deprecated standalone `restoreOrder` WMS alias and keep only the claim-specific restore function names (`restoreCanceledOrder`, `restoreReturnedOrder`, `restoreExchangedOrder`).

## 0.6.5

### Patch Changes

- 8f520b2: Add grouped WMS restore function names for cancel, return, and exchange actions.

## 0.6.4

### Patch Changes

- 52940de: Add first-class hook extension metadata support with `@Extension({ name: "hook" })`,
  `GetHooksOutputSchema`, `HookExtensionInterface`, and CLI/docs updates for the
  flat AppStore hook registration spec.

## 0.6.3

## 0.6.2

## 0.6.1

## 0.6.0

### Minor Changes

- e707ff7: Add WMS extension schemas, function-name helpers, and interface types to the SDK.

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

## 0.4.2

### Patch Changes

- cdc5ff3: Improve order extension type consistency
  - CancelOrderInput: replace `itemIds: string[]` with `cancelItems: { id: string; quantity?: number | null }[]`
  - ReturnOrderInput: make `returnItems[].quantity` optional and nullable (`number | null | undefined`)
  - ExchangeOrderInput: make `beforeExchangeItems[].quantity` optional and nullable (`number | null | undefined`)
  - ChangeShippingAddressInput: use shared `Address` type instead of inline type
  - GetExchangeableItemsInput: rename `itemIds: string[]` to `items: { id: string }[]`
  - FieldConfigSchema: add optional `description` field to freeform type

## 0.4.1

### Patch Changes

- 1c404bb: fix: align CommandResult schema with Channel App platform Action format
  - `CommandResult` fields changed from `{action, wamName, wamParams, text, url}` to `{type, attributes}` to match Channel App platform's `Action` struct.
  - `CommandResultActionType` enum 제거, `type`은 free-form `z.string().min(1)`으로 변경.
  - `CommandResultSchema`에 `.strict()` 추가하여 unknown 필드 거부.

## 0.4.0

### Minor Changes

- 1053ead: Unify context types and improve server infrastructure
  - Remove `ExtensionContext` and `FunctionContext`; unify into single `Context` type aligned with Go `ChannelContext`
  - Add `apiCredentials` to `Context`
  - Change `ValidateCredentialsInput` from wrapped object to flat record; remove `ValidateCredentialsInputSchema`
  - Update `ApiKey` extension schema and CLI `add` command
  - Improve `NativeFunctionClient` design and add token caching to `ChannelAppService`
  - Fix extension registration timing based on `HttpAdapterHost`

## Unreleased

### Breaking Changes

- **Context 타입 통합**: `ExtensionContext` 제거, `Context` 단일 타입으로 통합
  - `import type { ExtensionContext }` → `import type { Context }`
- **Context.app 제거**: Go `ChannelContext`에 없는 `app` 필드 삭제
- **Caller.type 필수화**: `string | undefined` → `"user" | "manager" | "system"` (required)
- **Caller.id 선택화**: required → optional (Go `omitempty` 반영)
- **ValidateCredentialsInput**: `{ credentials: Record<string, string> }` 래퍼 제거, flat `Record<string, string>`으로 변경

### Features

- **Context 필드 추가**: Go `ChannelContext` 기준으로 `language`, `authToken`, `apiCredentials`, `sandbox`, `sessionId`, `seedState` 추가
- **CallerType export**: `"user" | "manager" | "system"` 리터럴 유니언 타입 export
- **ApiKey extension 스키마**: `ApiKeyFieldSchema`, `ApiKeyConfigSchema`, `ApiKeyValidationResultSchema` 추가

### Bug Fixes

- **apiCredentials**: AppStore가 `context.apiCredentials`로 전달하는 것을 Context 타입에 반영
- **ValidateCredentialsInput**: AppStore가 flat record로 전달하므로 스키마 수정

## 0.3.1

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

## 0.2.0

## 0.1.1

### Patch Changes

- 9e5680f: Add "default" condition to package exports for CJS compatibility

  Generated NestJS apps compile to CommonJS (`"module": "commonjs"`), but the SDK
  only had `"import"` condition in exports, causing `ERR_PACKAGE_PATH_NOT_EXPORTED`
  at runtime. Adding `"default"` as a fallback condition resolves this.

## 0.1.0

### Minor Changes

- Initial release of Channel.io App SDK packages
