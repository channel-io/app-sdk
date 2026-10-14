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

## Team chat bot profiles (TypeScript)

`writeGroupMessage` accepts optional `botDisplayName` and `botAvatarUrl` fields
in its `NativeWriteMessageDto`. These fields initialize a new custom bot for
`botName`; they do not update a bot that already exists under that key.

For a Slack sender, keep `botName` as an opaque, profile-specific key such as
`slack-` followed by the first 24 hex characters of a SHA-256 digest (96 bits),
separate from the name shown in TeamChat. This keeps the key within the bot name's
30-character limit:

```typescript
await api.writeGroupMessage({
  channelId,
  groupId,
  dto: {
    plainText: "Message from Slack",
    botName: profileKey, // e.g. slack-<first 24 hex characters of SHA-256>
    botDisplayName: "루카 (Slack)",
    botAvatarUrl: "https://avatars.slack-edge.com/team-user_192.png",
  },
});
```

The app must generate and reuse a key for each sender profile revision, including
the sender identity, display name, and avatar revision. Use a new key when that
profile changes. Reusing an existing key retains its original display name and
avatar, even when different initialization values are sent. This preserves the
profile associated with earlier messages.

`botDisplayName` allows up to 30 UTF-16 code units and cannot contain `@`, `#`,
`$`, `%`, `:`, `/`, or backslash. Supplying only `botDisplayName` initializes the
name with a default avatar. `botAvatarUrl` also requires `botDisplayName`.

The avatar must use HTTPS on a backend-allowed Slack CDN. On bot creation, the
backend copies the image through its media service once; subsequent sends reuse
the stored profile. These fields require `botName` and are only supported by the
bot writer for `writeGroupMessage`, not manager/user writers or user-chat
methods. Omitting both fields preserves the existing bot-name behavior. The
backend must support these fields before an app starts sending them; adding SDK
types alone does not enable backend support.
