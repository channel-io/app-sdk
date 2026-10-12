# Native Functions

Native Functions are Channel-provided Functions.
A regular Function is an RPC exposed by an app server, while a Native Function is an RPC an app calls through AppStore to read or mutate Channel resources.

## Calling Native Functions

Native Functions are called through `PUT /general/v1/native/functions`.
The request body uses the same shape as regular Function calls.

```json
{
  "method": "writeUserChatMessage",
  "params": {}
}
```

Most Native Functions require `x-access-token`. Issue the token with `issueToken` or `TokenManager`, and pass the current access token at call time.

Successful responses include `result`; failed responses include `error`.

## SDK Structure

Native Function contracts are maintained as core types.

- Type map: `packages/core/src/types/native.ts`
- Root export: `packages/core/src/types/index.ts` -> `@channel.io/app-sdk-core`
- Transport client: `packages/server/src/native/client.ts`

Check `NativeFunctionTypeMap` in `packages/core/src/types/native.ts` for the modeled Native Functions.

`NativeFunctionClient` is transport-only. It does not run zod parsing at runtime; TypeScript infers params/result from the method string literal.

```ts
const result = await client.callNativeFunctionWithToken(
  "findOrCreateUserChatByMedium",
  params,
  accessToken,
);
```

AppDataTable functions are also modeled in the type map and schema exports. Use
an app-scoped token for all AppDataTable native functions. Functions that read
or write tenant data still require `channelId` as an input field, but AppStore
authorizes them against the caller app's `appId`; `channelId` is not a channel
RBAC scope requirement for these functions. The SDK only accepts logical `appId`,
`channelId`, `tableName`, schema columns, and rows; BigQuery project/dataset
names stay an AppStore/Core concern.

```ts
import { getNativeFunctionSchemas } from "@channel.io/app-sdk-server";

const schemas = getNativeFunctionSchemas();
```

## Typed Channel operations

For server-side Channel operations, obtain a channel token and create the typed proxy:

```ts
const token = await tokenManager.getChannelToken({ channelId });
const api = nativeClient.createProxyApi(token.accessToken);

await api.writeGroupMessage({
  channelId,
  groupId,
  dto: { plainText: "Hello", botName: "ExampleBot" },
});
```

Prefer a typed proxy method when one exists. Use `callNativeFunctionWithToken()` only for a public
Native Function already represented by your app's reviewed contract.

## Calling App Functions

`callAppFunction()` invokes a registered Function provided by another app or by your own app through
AppStore. It is not a Channel Native Function call. Pass the target app ID, exact Function method,
params, the current Function context, an access token with the required scope, and an optional system
version.

```ts
const result = await nativeClient.callAppFunction<Input, Output>(
  targetAppId,
  "orders.get",
  { orderId: "order-1" },
  ctx,
  channelToken.accessToken,
);
```

The target app and installed Channel relationship still requires business authorization. Do not
forward an untrusted WAM target, caller, or resource identifier without validating it in the server
Function.

## Contract source

The public SDK exports are the source of truth for supported TypeScript calls. Check
`NativeFunctionTypeMap`, `NativeFunctionClient`, and `ProxyApi` through the installed package's
types. Keep request and response models limited to that public surface, use camelCase JSON fields,
and treat intentionally open result models as opaque. The shared envelope is summarized in the
[cross-language protocol](../protocol.md).

## Create a group as the invoking manager (TypeScript)

`createGroupAsManager` creates a PUBLIC TeamChat group with the authenticated
invoking manager as its sole initial member. The request contains only
`channelId` and `title`; callers cannot supply `scope`, `memberId`, or
`managerIds`. Core resolves the manager from the trusted authentication context
and requires `teamChatRead/all`. An ordinary channel app token issued with
`issueToken` does not provide this manager context.

The core package exports `NativeCreateGroupAsManagerParams` and
`NativeCreateGroupAsManagerResult` and registers the method in
`NativeFunctionTypeMap`. The server package exposes the same contract as
`CreateGroupAsManagerRequest`, `CreateGroupAsManagerResult`, and the
`ProxyApi.createGroupAsManager` wrapper:

```typescript
// managerContextToken must already carry the authenticated invoking manager.
const api = client.createProxyApi(managerContextToken);
const { group } = await api.createGroupAsManager({
  channelId: "channel-1",
  title: "Support",
});
// group has type NativeGroup.
```

The typed `callNativeFunctionWithToken("createGroupAsManager", params, token)`
surface is also available. A duplicate title rejects the operation; it does
not return an existing group. The SDK does not automatically retry this
mutation. After a timeout or lost response, reconcile the unknown outcome
before deciding whether to retry. SDK types do not grant native-function
permission or establish manager authentication; the deployed Core function and
the app's native-function permission must also be available. Existing installed
SDK versions gain this type only after upgrading to a release containing it.
