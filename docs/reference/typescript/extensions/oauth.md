# OAuth Extension

Use the OAuth extension when a channel, manager, or both must connect a third-party account to a Channel app.

## Required Functions

Implement these function names:

- `extension.oauth.metadata.getAuthConfig`
- `extension.oauth.validation.validateCredentials`

`validateCredentials` is the contract AppStore expects for extension-based OAuth.

## Registration

Registration is still the generic extension flow:

- `registerExtension("oauth", "v1")`

During registration, AppStore reads your `getAuthConfig` result and stores provider metadata.

## `getAuthConfig` Output

Return the AppStore SSOT shape from `metadata.getAuthConfig`:

```typescript
import { OAuthConfigSchema, type OAuthConfig } from "@channel.io/app-sdk-core";

const config = {
  authType: "oauth",
  authScope: "channel",
  oauthProvider: {
    provider: "yahoo-shopping",
    authorizationUrl:
      "https://auth.login.yahoo.co.jp/yconnect/v2/authorization",
    tokenUrl: "https://auth.login.yahoo.co.jp/yconnect/v2/token",
    scopes: ["openid", "profile"],
    providerName: "Yahoo! Shopping",
    providerDescription: "Connect a Yahoo! Shopping store account.",
    i18nMap: {
      ko: {
        providerName: "야후 쇼핑",
        providerDescription: "Yahoo! Shopping 스토어 계정을 연결합니다.",
      },
      ja: {
        providerName: "Yahoo!ショッピング",
      },
      en: {
        providerDescription: "Connect a Yahoo! Shopping store account.",
      },
    },
    parameterCase: "snake",
    authorizationOpenMode: "popup",
  },
} satisfies OAuthConfig;

OAuthConfigSchema.parse(config);
```

`authScope` supports:

- `channel` for one shared channel connection
- `manager` for per-manager accounts
- `caller` when the same app needs both connection types

For `caller`, AppStore injects the current manager's credential when the
Function caller is a manager and the shared channel credential for every other
caller. A missing or unusable manager credential never falls back to the
channel credential. OAuth connection UI and native calls select a concrete
`channel` or `manager` target; `caller` is not a stored credential scope.

`oauthProvider.parameterCase` defaults to `snake`; set it to `camel` only for
providers that require camelCase OAuth standard parameters.

`oauthProvider.authorizationOpenMode` defaults to `popup`. Set it to
`currentTab` only when the provider redirects to a full Desk/AppStore URL and
cannot reliably complete the popup close flow.

`oauthProvider.authorizationCodeParamName` controls the callback query field
that AppStore reads. `oauthProvider.tokenRequest.authorizationCodeParamName`
controls the outbound field sent to the provider token endpoint. They are
separate because some providers use a custom callback field but still expect
the standard `code` token request field.

Use `oauthProvider.i18nMap` for locale-specific provider display text. The
base `providerName` remains required and is used as the fallback;
`providerDescription` remains optional. Locale entries are partial and support
only `providerName` and `providerDescription`. Supported locale keys are `ko`,
`ja`, and `en`.

Use `oauthProvider.tokenResponse` only when the provider nests or renames token
response fields. Paths use dot-separated JSON object keys such as
`data.access_token`; arrays are not supported. Every mapping field is optional.
When omitted, AppStore keeps the existing top-level defaults: `code`,
`access_token`, `refresh_token`, `expires_in`, and `token_type`.

For example, a provider that expects `auth_code` and nests its response under
`data` can declare only the non-standard token contract:

```ts
import type { OAuthProvider } from "@channel.io/app-sdk-core";

const tokenMapping = {
  tokenRequest: {
    authorizationCodeParamName: "auth_code",
  },
  tokenResponse: {
    accessTokenPath: "data.access_token",
    refreshTokenPath: "data.refresh_token",
    expiresInPath: "data.expires_in",
    tokenTypePath: "data.token_type",
  },
} satisfies Pick<OAuthProvider, "tokenRequest" | "tokenResponse">;
```

Do not return provider `clientId` or `clientSecret` from `getAuthConfig`.
AppStore stores client credentials separately through Desk OAuth credential
APIs/UI.

## Runtime Native Functions

Once the extension is registered, the manager experience depends on manager-scoped native functions that are now public defaults in AppStore:

- `getOAuthConfig`
- `getOAuthConnection`
- `getOAuthAuthorizationURL`
- `disconnectOAuth`

These are manager-level operations, not app-level registration calls.

## OAuth Lifecycle Hooks

Register `oauth.connected` and `oauth.disconnected` through the Hook extension
when the app must react to OAuth connection lifecycle changes. Each Hook config
contains only `type`, `actionFunctionName`, and an optional `systemVersion`:

```ts
{
  type: "oauth.connected",
  actionFunctionName: "hooks.oauth.onConnected",
  systemVersion: "v1",
}
```

OAuth lifecycle Hook configs do not accept `targetId`, `webhook`, or a webhook
endpoint token. Those settings belong only to a separately declared
`webhook.received` Hook.

For a manager OAuth event, use `params.managerId` to identify the connected
manager. `context.caller` remains the system caller (`{ type: "system", id:
"system" }`), not that manager. `context.authToken` contains the newly issued
provider access token on `oauth.connected`.

When a manager connects and the app has separately declared a manager-scoped
`webhook.received` target, AppStore may also provide
`context.webhooks?.[targetId]?.url`. This is an optional fast path for
registering the provider callback URL. The URL can be absent and Hook delivery
can fail, so polling active manager targets is the required recovery path.
Do not expect webhook URLs for channel OAuth or `oauth.disconnected` events.

Use the app-scoped token from `TokenManager` to page those targets:

```ts
const { accessToken } = await tokenManager.getAppToken();
const page = await nativeClient.listActiveOAuthManagerTargets(
  { limit: 500, cursor },
  accessToken,
);
```

`listActiveOAuthManagerTargets` accepts only an app token, never a channel or
manager token. Persist or reconcile the returned `{ channelId, managerId }`
targets so a missed lifecycle Hook can be recovered safely.

## Implementation Notes

- Put provider configuration under `oauthProvider` in `metadata.getAuthConfig`
- Return only provider metadata there. Do not treat it as a token exchange handler
- `validateCredentials` is called by AppStore after token exchange with `ctx.authToken`
  populated and should return `{ valid: boolean }`
- `oauth.connected` receives the newly issued provider token in `ctx.authToken`; it is
  distinct from the app token used for native target polling
- In WAM or Desk surfaces, use `useNativeFunction()` only when the current role and surface expose the relevant manager native functions

## Reference

- [examples/calendar](../../../../ts/examples/calendar/README.md)
