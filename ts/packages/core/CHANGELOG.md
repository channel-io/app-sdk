# @channel.io/app-sdk-core

## 0.25.0

### Minor Changes

- ecfde4e: Relax six output fields in the commerce (and legacy order) contract that the SDK could not
  guarantee: `Claim.createdAt`, `CommerceOrderItem.claimability`, and `Payment`'s `itemsAmount`,
  `shippingAmount`, `discountAmount` and `requireRefundBankAccount`.

  Each was declared required while a mall could legitimately have nothing to put there.
  `Claim.createdAt` is a presence-less `double`, so an unset value is indistinguishable from `0` and
  serialization drops the key. `claimability` is a proto3 message field with implicit presence, so an
  app that never computes it emits no key at all — the same reason the four booleans inside it stopped
  being required, one level up. The payment fields carry presence, so `0`/`false` still serialize;
  they are relaxed because they are the breakdown of the total, and not every mall separates item
  subtotal, shipping and discount, or has a refund bank account concept. `totalAmount` — which every
  mall reports — stays required, alongside `state` and `currency`.

  Only the canonical schema's `required` lists change; generated field types are unaffected, so no
  builder or accessor code needs updating. Consumers reading any of these six should treat them as
  possibly absent.

## 0.24.2

### Patch Changes

- 63d3174: Deliver `teamChat.messageCreated` with the full immutable Channel Message snapshot instead of a flattened content subset.

## 0.24.1

### Patch Changes

- a5e4958: Allow `teamChat.messageCreated` to represent public-group root messages by making `rootMessageId` optional.

## 0.24.0

### Minor Changes

- 494c902: Replace the `getExchangeableItems` output with `exchangeableItems`, which carries the variants an
  order item can be exchanged for. The previous `items` only listed which order items were
  exchangeable, so there was no way to learn the `variantId` that `requestExchangeOrder`'s
  `afterExchangeItems` requires — the exchange flow could not be implemented from the contract alone.
  Each variant carries its `additionalAmount`, human-readable `options`, and stock: `stockQuantity` is
  left unset when a variant does not track inventory, so `0` (sold out) stays distinguishable from
  unlimited, with `useInventory` telling the two apart.

  `items` is removed rather than kept alongside: no app implements commerce `getExchangeableItems` in
  either production or exp, and no task calls it, so nothing consumes the field today.

  `OrderClaimability` gains four reason fields — `nonCancelableReason`, `nonReturnableReason`,
  `nonExchangeableReason`, `nonShippingAddressChangeableReason`. The booleans alone cannot explain
  _why_ a claim is unavailable, which malls do report and tasks need in order to tell the customer.
  Commerce and order extensions share the type, so both `getOrders` outputs carry them.

- 836c817: commerce·order 계약에 몰 공통 필드를 추가한다.

  표준 모델이 담지 못해 각 앱이 자기 확장으로 따로 실어 나르던 값들이다. 카페24를 commerce
  extension 으로 옮기며 드러났지만 카페24만의 문제가 아니라, 같은 값을 shopby·godomall 도
  지금 버리고 있다.

  CommerceOrder
  market_id / market_order_no — 외부 마켓(네이버·쿠팡 등) 유입 주문의 마켓과 그 마켓 주문번호.
  shopby channelId, godomall channelId·mall 이 같은 개념이다.

  CommerceOrderItem
  status_code / status_text — 몰이 준 진행 상태 원문 코드와 표시 문구. state 는 정규화 값이라
  몰 고유 상태로 분기하려면 원문이 필요하다. shopby orderStatusType, godomall currentStatus.
  claim_status_code — 클레임 성격(정상·취소·반품·교환) 코드. 진행 상태와 축이 다르다.
  shopby 도 orderStatusType 과 claimStatusType 을 따로 둔다.
  supplier_id / supplier_name — 상품 공급사.
  option_amount — 옵션 추가금. amount 에 합산돼 있으나 분리해 보여줘야 하는 몰이 있다.
  bundle / bundle_id / bundle_name / bundle_type / bundle_items — 세트(번들) 상품과 그 구성품.

  OrderPayment (order·commerce 공유)
  point_amount / credit_amount / coupon_discount_amount — discount_amount 는 이 셋의 합이라
  무엇으로 깎였는지 안내할 수 없었다. godomall mileage, colorme point_discount,
  shopby 쿠폰 할인 3종이 같은 개념이다.
  due_amount — 아직 결제되지 않은 잔액(무통장 입금 대기 등).

  OrderAddress (order·commerce 공유)
  country_code — ISO 3166-1 alpha-2. country 는 표시용 국가명이라 코드 비교에 쓸 수 없다.
  shopby·godomall 은 이미 이 값을 갖고 있고 ch-dropwizard 의 주소 모델에도 있다.

  OrderFulfillment (order·commerce 공유)
  tracking_company_name — tracking_company 에 택배사 "코드" 가 들어가는 몰이 있어 사람이 읽을
  수 없었다(shopby DeliveryCompanyType, 카페24 shippingCompanyCode). 표시용 이름을 따로 둔다.
  items — 한 배송 안에서 항목별로 상태가 갈리는 몰이 있다. state 는 배송 단위 상태다.

  전부 추가 필드이고 기존 필드의 타입·필수 여부는 건드리지 않는다. 새 필드는 모두 optional 이라
  채우지 않는 앱은 영향이 없다.

- 3e4e4b1: Widen the commerce order contract with fields malls already return but the contract could not
  carry — `payment.taxAmount`, item `sku`/`taxLines`/`unfulfilledQuantity`/`requiresShipping`/selling
  plan, and order `adminUrl`/`note`/display statuses/`billingAddress`/`shippingLines`/`transactions`/
  `metafields`/`customAttributes`. `OrderTransaction` exists so cash-on-delivery and deferred payment
  can be told apart, which `payment.methods` alone cannot express.

  `OrderClaimability`'s four booleans now carry explicit presence. A proto3 plain bool cannot tell
  `false` from unset, so JSON serialization dropped every `false` and an item that allowed no claim
  at all was emitted as `claimability: {}`, contradicting the schema that advertises those fields as
  required. Generated field types change from `bool` to an optional boolean, so code that builds
  `OrderClaimability` through struct literals needs updating; accessors are unchanged.

- 65d4196: Stop dropping order-contract fields whose zero value is a real value. protojson omits a field
  without presence when it holds the zero value, so fields the contract declares as required went
  missing in common situations — `claims` on an order with no claims, `shippingAmount` on free
  shipping, `success: false` on a failed action. The declaration and the wire format disagreed, and
  consumers read `undefined` where the contract promised a value.

  **Given presence so the value is emitted** (still required) — zero and `false` are real values here:

  - `CommerceResultBody.success`
  - `OrderPayment.totalAmount` / `itemsAmount` / `shippingAmount` / `discountAmount` /
    `requireRefundBankAccount`
  - `CommerceOrderItem.amount`
  - `CommerceExchangeableVariant.additionalAmount`

  The Go types change from `float64`/`bool` to `*float64`/`*bool`, so an app that fills these must
  set them through a pointer. Leaving one unset omits the key exactly as before.

  **Dropped from required** — these are repeated fields, and protobuf does not allow `optional` on
  them, so an empty list is indistinguishable from an absent one:

  - `Order.claims` / `Order.fulfillments`
  - `OrderPayment.methods`
  - `OperationOptions.required` / `OperationOptions.optional`

  The last two are shared by the `order` and `commerce` extensions, so both contracts change.

### Patch Changes

- 0ff5a85: Export Go aliases for the commerce order value types added alongside the widened order contract —
  `TaxLine`, `Attribute`, `ShippingLine`, `Transaction`, and `Metafield`. Their generated code lives
  under an internal package, so without an alias an app could see the fields in the schema but had no
  way to construct the values.

  A test walks the proto descriptors reachable from the order contract and fails when one of those
  messages has no alias in the commerce package, so adding a message without exporting it is caught
  rather than discovered by the first app that needs the value.

- 2862b3d: Add the optional numeric `errorCode` field to `MessagingSendResult` so messaging apps can return a
  stable failure reason from `onMediumMessageCreated`. The runtime can persist the code on the failed
  Channel message and pass it to `getMediumMessageErrorReason` for a safe user-facing explanation.
- 8354525: Add the `teamChat.messageCreated` Hook type and proto-backed bounded input and terminal result
  schemas for committed TeamChat message delivery.

## 0.23.1

### Patch Changes

- 186ad95: Expose the typed `prepareAppMediaUpload` native function and server client helper for app-owned
  public Media uploads.

## 0.23.0

### Minor Changes

- 2e304e0: Add the snapshot-free `userChat.opened` lifecycle Hook contract and the one-purpose Manager
  private-note native call. Authenticated native calls accept an optional abort signal, and Manager
  private-note debug logs omit request and response content.

### Patch Changes

- 49eb8be: Preserve `hidden` metadata on Config fields so AppStore can omit them from the standard setup UI.
- 3db1aac: Add `fulfillmentId` to `OrderClaimItem`. A single line item can be shipped across several
  fulfillments, so returning one requires naming the fulfillment alongside the item. The field is
  optional and only meaningful for returns; cancel and exchange inputs may leave it unset.

## 0.22.0

### Minor Changes

- 4b31e78: Add caller-scoped OAuth authentication support.

### Patch Changes

- cd0e937: Accept MySQL as a DataSource catalog dialect.
- 2794296: Support manager permission metadata on individual DataSource tables.

## 0.21.1

### Patch Changes

- cc224b5: Add Config Extension field references for Config-backed OAuth client credentials.

## 0.21.0

### Minor Changes

- aac3364: Remove the extension-specific `registerAlfTasks` and `registerAppNotebooks` SDK APIs. Registering or refreshing ALF Task and Notebook extensions now uses the common `registerExtension` flow.

## 0.20.1

### Patch Changes

- 7632db8: Expose manager-scoped webhook metadata and AppStore-issued callback URLs in Function context, including the OAuth connected lifecycle fast path and OAuth lifecycle Hook schemas.
- 2ca28c1: Add App Token-only paginated OAuth manager target discovery and a typed server client method.

## 0.20.0

## 0.19.1

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
