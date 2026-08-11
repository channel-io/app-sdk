# PR #4 SDK Platform Contracts Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** App Store의 active OAuth manager target Native Function과 OAuth lifecycle Hook/webhook context 계약을 TypeScript SDK에서 타입 안전하게 호출·등록·문서화한다.

**Architecture:** Core package의 native type map과 Zod schema catalog를 계약의 SSOT로 확장하고, Server package의 `NativeFunctionClient`가 app token을 명시적으로 받아 전용 method를 호출한다. Hook metadata schema에는 두 OAuth lifecycle type을 target/webhook metadata 없는 strict variants로 추가하고, 기존 proto-backed `Context.webhooks`를 lifecycle fast path 문서와 연결한다.

**Tech Stack:** TypeScript 5.7, Zod 3, Vitest 3, pnpm 9.15.4, Changesets

## Global Constraints

- `cht-app-google-calendar`와 PR #4는 수정하지 않는다.
- Native Function 이름은 정확히 `listActiveOAuthManagerTargets`다.
- 요청은 `{ cursor?: string; limit: number }`, limit은 integer `1..500`, app ID는 요청에 포함하지 않는다.
- 응답은 `{ targets: Array<{ channelId: string; managerId: string }>; nextCursor?: string }`이며 다른 credential/provider field를 정의하지 않는다.
- Server client method signature는 `listActiveOAuthManagerTargets(params, accessToken)`이며 app-scoped token 사용을 문서화한다.
- `oauth.connected`와 `oauth.disconnected` Hook config는 `actionFunctionName`과 optional `systemVersion`만 허용하고 `targetId` 또는 `webhook` metadata를 허용하지 않는다.
- lifecycle handler는 manager event의 `params.managerId`를 사용하며 `context.caller`는 `{ type: "system", id: "system" }`으로 유지된다.
- `context.webhooks[targetId].url`은 manager `oauth.connected`의 선택적 fast path이고 polling이 복구 경로다. channel OAuth와 disconnected에서는 기대하지 않는다.
- 현재 이미 존재하는 `WebhookEndpointContext`, `Context.webhooks`, protobuf field 13, `.changeset/manager-webhook-bindings.md`를 중복 생성하거나 제거하지 않는다.
- publish/version bump를 직접 수행하지 않는다. changeset만 추가하고 실제 최소 버전은 release automation 결과로 확정한다.

---

### Task 1: Native Function core/server 계약

**Files:**
- Modify: `ts/packages/core/src/types/native.ts`
- Modify: `ts/packages/core/src/schemas/native.ts`
- Modify: `ts/packages/core/src/__tests__/schemas/native.test.ts`
- Modify: `ts/packages/server/src/native/client.ts`
- Modify: `ts/packages/server/src/__tests__/native-client.test.ts`
- Create: `ts/.changeset/oauth-manager-targets.md`

**Interfaces:**
- Produces `NativeActiveOAuthManagerTarget`, `NativeListActiveOAuthManagerTargetsParams`, `NativeListActiveOAuthManagerTargetsResult`.
- Adds `listActiveOAuthManagerTargets` to `NativeFunctionTypeMap` and `nativeFunctionSchemaDefinitions`.
- Produces `NativeFunctionClient.listActiveOAuthManagerTargets(params, accessToken)`.

- [ ] **Step 1: core schema/type 실패 테스트 작성**

`native.test.ts`에서 schema catalog에 exact method name이 추가되어 총 7개가 되고, input은 `{limit:1}`, `{limit:500,cursor:"cursor"}`를 accept하며 `limit` 0/501/fractional, empty cursor, extra `appId`를 reject하는지 검증한다. output은 target의 두 non-empty ID와 optional non-empty `nextCursor`만 accept하고 token/credential/provider 같은 extra field를 reject하도록 strict schema behavior를 검증한다.

Compile-time type assertion은 다음 호출 map이 정확한 params/result를 resolve하는지 확인한다.

```ts
type Params = NativeFunctionParams<"listActiveOAuthManagerTargets">;
type Result = NativeFunctionResult<"listActiveOAuthManagerTargets">;
```

Run: `cd ts && corepack pnpm --filter @channel.io/app-sdk-core test -- src/__tests__/schemas/native.test.ts`
Expected: FAIL because the new native schema/types are absent.

- [ ] **Step 2: core types와 strict Zod schema 구현**

다음 public shapes를 추가한다.

```ts
export interface NativeActiveOAuthManagerTarget {
  channelId: string;
  managerId: string;
}

export interface NativeListActiveOAuthManagerTargetsParams {
  cursor?: string;
  limit: number;
}

export interface NativeListActiveOAuthManagerTargetsResult {
  targets: readonly NativeActiveOAuthManagerTarget[];
  nextCursor?: string;
}
```

Zod input/output/target schema는 `.strict()`를 사용한다. limit은 `z.number().int().min(1).max(500)`, 모든 string은 existing non-empty schema를 사용한다. schema definition description에는 active manager-scoped OAuth targets를 app token의 own app 범위에서 page한다고 명시한다.

Run: `cd ts && corepack pnpm --filter @channel.io/app-sdk-core test -- src/__tests__/schemas/native.test.ts`
Expected: PASS.

- [ ] **Step 3: Server client 실패 테스트 작성**

`native-client.test.ts`에서 method가 exact JSON-RPC body를 보내는지 검증한다.

```json
{
  "method":"listActiveOAuthManagerTargets",
  "params":{"limit":500,"cursor":"cursor-1"}
}
```

`x-access-token` header는 전달한 app token이어야 하고 body에 `appId`가 없어야 한다. typed result는 targets와 nextCursor를 그대로 반환해야 한다.

Run: `cd ts && corepack pnpm --filter @channel.io/app-sdk-server test -- src/__tests__/native-client.test.ts`
Expected: FAIL because the client method does not exist.

- [ ] **Step 4: Server client method와 imports 구현**

`NativeFunctionClient`에 다음 signature를 추가하고 existing `callNativeFunctionWithToken`을 사용한다.

```ts
listActiveOAuthManagerTargets(
  params: NativeListActiveOAuthManagerTargetsParams,
  accessToken: string
): Promise<NativeListActiveOAuthManagerTargetsResult>
```

JSDoc은 `TokenManager.getAppToken()` 또는 channelId 없이 발급한 app token을 사용하고, channel/manager token은 거부된다고 설명한다.

- [ ] **Step 5: core/server changeset 추가 및 검증**

`oauth-manager-targets.md` frontmatter에 core/server 모두 patch로 넣고 App Token 전용 paginated target discovery와 typed client method를 요약한다.

Run: `cd ts && corepack pnpm --filter @channel.io/app-sdk-core build && corepack pnpm --filter @channel.io/app-sdk-server build`
Expected: PASS.

Run: `cd ts && corepack pnpm --filter @channel.io/app-sdk-core test && corepack pnpm --filter @channel.io/app-sdk-server test`
Expected: PASS.

- [ ] **Step 6: Task 1 커밋**

```bash
git add ts/packages/core/src/types/native.ts ts/packages/core/src/schemas/native.ts ts/packages/core/src/__tests__/schemas/native.test.ts ts/packages/server/src/native/client.ts ts/packages/server/src/__tests__/native-client.test.ts ts/.changeset/oauth-manager-targets.md
git commit -m "feat: add OAuth manager target contracts"
```

### Task 2: OAuth lifecycle Hook schema와 사용 문서

**Files:**
- Modify: `ts/packages/core/src/extensions/hook.ts`
- Modify: `ts/packages/core/src/__tests__/extensions/hook.test.ts`
- Modify: `ts/packages/core/src/__tests__/schemas/metadata.test.ts`
- Modify: `docs/reference/typescript/extensions/oauth.md`
- Modify: `docs/reference/typescript/extensions/hook.md`
- Modify: `docs/reference/typescript/AUTH-AND-TOKENS.md`
- Modify: `docs/guides/en/extensions/oauth.md`
- Modify: `docs/guides/ko/extensions/oauth.md`
- Modify: `docs/guides/ja/extensions/oauth.md`
- Modify: `ts/.changeset/manager-webhook-bindings.md`

**Interfaces:**
- Produces Hook types `oauth.connected` and `oauth.disconnected` as strict lifecycle variants.
- Documents Native client usage with `TokenManager.getAppToken()`, lifecycle `params.managerId`, system caller, and optional manager webhook fast path.

- [ ] **Step 1: Hook schema 실패 테스트 작성**

`hook.test.ts`와 metadata test에서 두 lifecycle types가 `actionFunctionName`과 optional `systemVersion`으로 parse되는지 검증한다. 각 type에 `targetId`, `webhook`, endpoint token을 추가한 payload는 reject되어야 한다. `HookTypeSchema`가 두 exact literals를 포함하는지도 검증한다.

Run: `cd ts && corepack pnpm --filter @channel.io/app-sdk-core test -- src/__tests__/extensions/hook.test.ts src/__tests__/schemas/metadata.test.ts`
Expected: FAIL because OAuth lifecycle hook types are absent.

- [ ] **Step 2: strict Hook variants 구현**

`HookTypeSchema` enum에 `oauth.connected`, `oauth.disconnected`를 추가하고 `HookConfigSchema` discriminated union에 각각 다음 형태를 추가한다.

```ts
BaseHookConfigSchema.extend({ type: z.literal("oauth.connected") }).strict()
BaseHookConfigSchema.extend({ type: z.literal("oauth.disconnected") }).strict()
```

Run: `cd ts && corepack pnpm --filter @channel.io/app-sdk-core test -- src/__tests__/extensions/hook.test.ts src/__tests__/schemas/metadata.test.ts`
Expected: PASS.

- [ ] **Step 3: TypeScript reference와 다국어 guide 업데이트**

OAuth reference에 `NativeFunctionClient`와 `TokenManager.getAppToken()`을 이용한 다음 흐름을 문서화한다.

```ts
const accessToken = await tokenManager.getAppToken();
const page = await nativeClient.listActiveOAuthManagerTargets(
  { limit: 500, cursor },
  accessToken
);
```

`params.managerId`는 manager event에만 있고 `context.caller`는 manager가 아니라 system임을 명시한다. `context.authToken`은 새 access token이며 manager connected에서만 `context.webhooks?.[targetId]?.url`이 함께 올 수 있다. URL이 없거나 hook delivery가 실패할 수 있으므로 target polling이 복구 경로이고 disconnected/channel OAuth에는 webhooks를 기대하지 않는다고 명시한다.

Hook reference와 en/ko/ja guide는 같은 의미를 유지한다. 기존 `Context.webhooks`와 Webhook binding 설명을 중복 타입으로 만들지 않는다.

- [ ] **Step 4: changeset 정리 및 전체 검증**

기존 `manager-webhook-bindings.md` summary에 OAuth connected lifecycle fast path와 OAuth lifecycle Hook schema release를 포함하되 package는 core patch 그대로 유지한다.

Run: `cd ts && corepack pnpm build`
Expected: all workspace package builds PASS.

Run: `cd ts && corepack pnpm test`
Expected: all workspace tests PASS.

Run: `cd ts && corepack pnpm lint`
Expected: PASS.

Run: `git diff --check origin/main...HEAD`
Expected: no output and exit code 0.

- [ ] **Step 5: Task 2 커밋**

```bash
git add ts/packages/core/src/extensions/hook.ts ts/packages/core/src/__tests__/extensions/hook.test.ts ts/packages/core/src/__tests__/schemas/metadata.test.ts docs/reference/typescript/extensions/oauth.md docs/reference/typescript/extensions/hook.md docs/reference/typescript/AUTH-AND-TOKENS.md docs/guides/en/extensions/oauth.md docs/guides/ko/extensions/oauth.md docs/guides/ja/extensions/oauth.md ts/.changeset/manager-webhook-bindings.md
git commit -m "docs: publish OAuth lifecycle contracts"
```
