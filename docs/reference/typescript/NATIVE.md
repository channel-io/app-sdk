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
  accessToken
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
  channelToken.accessToken
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

## Team chat sender presentation

`writeGroupMessage` accepts optional `externalSenderProfile: { key, displayName, avatarUrl? }`.
It is persisted on each message for display only; `personType`/`personId` still
identify the actual writer. `botName` must identify an existing bot when this
field is supplied. The operation never creates or updates a bot for the sender.

Use an opaque key per external sender/profile revision to keep consecutive
messages by different senders visually separate. `displayName` allows 128 UTF-16
units without control/format characters. `avatarUrl` accepts permanent, unsigned HTTPS app media URLs on `cf.channel.io`
or `cf.exp.channel.io` (`/app-store/{appId}/media/{channelId}/{uuid}/{filename}`).
Legacy allowed Slack image hosts remain supported. Import provider photos during
profile synchronization and reuse the stored CDN URL; DW stores the URL without
a per-message upload, and Desk needs no separate App Store profile lookup.
Omitting the avatar uses the existing bot avatar. Other writer endpoints reject
`externalSenderProfile`; omitting the entire field preserves legacy behavior.

Deploy proto/DW and Desk display support before enabling the Slack caller.
The caller retains provider profiles in its own cache/database. Existing messages
keep their stored snapshot. No manager permissions or identity are inferred.
