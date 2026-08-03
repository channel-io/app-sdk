# Authentication And Tokens

Channel app authentication has separate inbound, server-outbound, WAM, and external-provider trust boundaries. Do not reuse one credential as if it represented another.

## Credential Map

| Value                        | Represents                                                               | Where it belongs                                                       |
| ---------------------------- | ------------------------------------------------------------------------ | ---------------------------------------------------------------------- |
| App ID                       | Public identity of an app                                                | Server and WAM may use it                                              |
| App Secret                   | Long-lived credential used to issue app/channel token pairs              | Server secret manager only                                             |
| Signing Key                  | HMAC key for Function requests sent by AppStore                          | Server secret manager only                                             |
| App access/refresh token     | App-scoped native operations such as Extension registration              | Server token cache                                                     |
| Channel access/refresh token | Server-side native operations in one installed Channel                   | Per-channel server token cache                                         |
| Manager/User authorization   | Current user acting through a Channel client surface                     | Managed by the Channel WAM host; not issued by `TokenManager`          |
| Provider OAuth token         | Connected external provider account                                      | Decrypted and injected into `ctx.authToken` when the Function needs it |
| Config credential            | API keys, `client_credentials`, per-shop credentials, and similar values | Stored by AppStore and injected through `ctx.config`                   |

Never put App Secret, Signing Key, access/refresh tokens, provider tokens, or config credentials in WAM bundles, `wamArgs`, source control, fixtures, logs, or error responses.

## Incoming Function Requests

The public Function Endpoint receives calls in this direction:

```text
Channel client or system → AppStore → signed PUT /functions/:version → app server
```

AppStore sends `x-signature`, calculated as HMAC-SHA256 over the exact raw request body with the hex-encoded Signing Key and encoded as Base64. Verify it before trusting `method`, `params`, or `context`. Do not parse and re-serialize JSON before verification because that changes the signed bytes.

For NestJS, enable raw-body capture and install the SDK guard:

```ts
const app = await NestFactory.create(AppModule, { rawBody: true });
```

```ts
@Module({
  imports: [ChannelAppModule.forRoot(channelAppOptions)],
  providers: [
    MyFunctions,
    {
      provide: APP_GUARD,
      useFactory: () => new SignatureGuard(channelAppOptions),
    },
  ],
})
export class AppModule {}
```

`skipSignatureVerification` is for isolated local tests only. Do not enable it in a deployed app. Reject a missing signature, invalid signature, or unavailable raw body.

## Server-Outbound Native Calls

The app server calls AppStore native Functions with an app- or channel-scoped access token. Prefer `TokenManager` over direct `NativeFunctionClient.issueToken()` calls.

```ts
const appToken = await tokenManager.getAppToken();
await nativeClient.registerExtension(
  appId,
  "command",
  "v1",
  appToken.accessToken,
);

const channelToken = await tokenManager.getChannelToken({
  channelId: ctx.channel.id,
});
const api = nativeClient.createProxyApi(channelToken.accessToken);
```

- **App token**: Extension registration and other app-owned operations.
- **Channel token**: server-side operations within one Channel where the app is installed.

`TokenManager`:

- caches app and channel token pairs by scope;
- refreshes them before expiry;
- immediately refreshes a newly issued token once when its lifetime is already inside the refresh buffer;
- falls back to re-issue when refresh fails;
- deduplicates concurrent issue/refresh work in one process;
- supports a custom `TokenCacheStorage`, including an optional storage-backed `withLock` hook for cross-replica coordination.

`issueToken` and `refreshToken` share a native rate limit of 10 calls per 30 minutes per app. Never issue a token for every Function call. Omitting `channelId` issues an app token; supplying the ID of an installed Channel issues a channel token for permitted server-side operations in that Channel. Both calls return an access/refresh token pair and `expiresIn` in seconds. The default cache is in memory and therefore process-local. Multiple replicas should use a shared cache implementation such as Redis or a database so token pairs are shared.

For strict cross-replica coordination, implement the optional `withLock` method on that same storage. `TokenManager` acquires it after process-local deduplication and reads the shared cache again while holding the lock, so only one replica issues or refreshes a missing token. The lock must be distributed, scoped by the supplied key, invoke the callback exactly once, and always release after success or failure:

```ts
class RedisTokenCache implements TokenCacheStorage {
  // get, set, delete, and clear omitted

  async withLock<T>(key: string, callback: () => Promise<T>): Promise<T> {
    return this.distributedLock.runExclusive(`token-manager:${key}`, callback);
  }
}
```

Set the lock lease and wait timeout longer than the AppStore request timeout. A shared cache without `withLock` still shares completed tokens, but simultaneous cache misses in different replicas can each issue a token.

Direct repeated use of `NativeFunctionClient.issueToken()` does not cache for you. Use it only when you intentionally own persistence, expiry calculation, refresh, invalidation, and concurrency control.

## Auto-Registration

The normal NestJS startup flow is:

1. Start the HTTP server with `ChannelAppModule.forRoot(...)` and `autoRegister: true`.
2. The shared `TokenManager` obtains a cached app token.
3. `NativeFunctionClient.registerExtension()` registers each discovered Extension and system version.
4. AppStore calls the app's discovery Function to read Function names and schemas.

Registration uses an app token. It does not replace inbound `x-signature` verification, and successful registration does not prove that every Function handler works.

## WAM Authorization

WAM code normally issues no token itself. It calls the host bridge through the SDK:

- `useCallFunction()` calls an app Function through AppStore.
- `useNativeFunction()` calls a Channel native Function exposed to the current surface and manager/user role.

Use `useCallFunction()` for business logic and work performed as the app or bot; the app server can then obtain a channel token. Use `useNativeFunction()` for work explicitly performed by the current manager or user. The server's `TokenManager` cannot mint manager/user authorization.

## External Provider Authentication

Do not confuse external-service credentials with Channel App tokens.

- **OAuth Authorization Code**: declare the OAuth Extension. After connection and token exchange, AppStore injects the decrypted provider token into `ctx.authToken` for the relevant Function call.
- **Config credential**: use the Config Extension for API keys, `client_credentials`, per-shop
  secrets, and non-redirect authentication. AppStore resolves values into `ctx.config`.

Read provider credentials only inside the server Function that needs them, minimize logging around outbound provider calls, and handle absent or revoked credentials explicitly.

## Choosing An API

| Use case                                         | Recommended API                        |
| ------------------------------------------------ | -------------------------------------- |
| NestJS routing, discovery, and auto-registration | `ChannelAppModule.forRoot()`           |
| App/channel token lifecycle                      | `TokenManager`                         |
| Typed or low-level server native calls           | `NativeFunctionClient`                 |
| Incoming Function request authentication         | `SignatureGuard` with raw body capture |
| WAM app Function call                            | `useCallFunction()`                    |
| WAM manager/user native call                     | `useNativeFunction()`                  |

For the broader model, read [Concepts](../../guides/en/concepts.md). For a complete server and WAM flow, see the [TypeScript tutorial](https://github.com/channel-io/app-tutorial-ts).
