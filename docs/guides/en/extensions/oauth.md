# OAuth Extension

Use OAuth only for an external provider's Authorization Code flow. Use Config for API keys,
`client_credentials`, or per-shop secrets.

## Contract

| Function                                         | Requirement | Purpose                                      |
| ------------------------------------------------ | ----------- | -------------------------------------------- |
| `extension.oauth.metadata.getAuthConfig`         | Required    | Declares provider and authorization metadata |
| `extension.oauth.validation.validateCredentials` | Required    | Validates the connected provider token       |

Register `oauth:v1`. AppStore owns redirect state and token exchange, stores client credentials
separately, and injects the connected provider access token as `ctx.authToken`.

## Metadata model

- Return `authType: "oauth"`, `authScope: "channel" | "manager"`, and `oauthProvider`.
- Provider metadata includes a stable provider key, authorization/token URLs, scopes, and a fallback
  provider name. Keep client ID/secret outside this Function.
- `parameterCase` controls standard OAuth parameter casing; `authorizationOpenMode` chooses popup or
  current-tab behavior.
- Use separate authorization-code parameter settings when callback and token request field names
  differ. Use dot-separated `tokenResponse` paths only for non-standard nested token responses.
- `i18nMap` localizes provider name/description; base text remains the fallback.

## TypeScript

Implement `OAuthExtensionInterface` with `@Extension({ name: "oauth", systemVersion: "v1" })`.
Validate metadata with `OAuthConfigSchema` and credentials with
`CredentialValidationInputSchema`/`CredentialValidationResultSchema`. Do not return a provider
client secret from metadata. See the [TypeScript OAuth reference](../../../reference/typescript/extensions/oauth.md).

## Go

```go
err := app.Use(oauth.Extension().
  GetAuthConfig(handler.GetAuthConfig).
  ValidateCredentials(handler.ValidateCredentials))
```

Use `extension/oauth` DTOs and read the provider token from the Function context rather than an app
or channel token.

## Authentication, WAM, and reliability

- Choose `channel` scope for a shared connection and `manager` for a personal connection.
- A WAM may call the manager-scoped OAuth native Functions exposed by its current surface.
- Treat `ctx.authToken` as a provider token; `TokenManager` app/channel tokens are unrelated.
- Test denied consent, invalid state, refresh failure, disconnect, expired credentials, and missing
  WAM authorization without logging tokens.

## Lifecycle recovery

Register `oauth.connected` and `oauth.disconnected` Hook handlers with only
`actionFunctionName` and optional `systemVersion`; do not put `targetId`,
`webhook`, or an endpoint token on either lifecycle Hook. For manager events,
use `params.managerId` as the manager identity. `context.caller` remains the
system caller, not the manager, and `context.authToken` is the newly issued
provider access token on `oauth.connected`.

If a manager `oauth.connected` Hook also has a separately declared
manager-scoped webhook target, `context.webhooks?.[targetId]?.url` may be an
optional callback-registration fast path. It can be absent and Hook delivery
can fail, so page active manager targets with an app token from
`TokenManager.getAppToken()` as the recovery path. Do not expect webhook URLs
for channel OAuth or `oauth.disconnected`.

```ts
const { accessToken } = await tokenManager.getAppToken();
const page = await nativeClient.listActiveOAuthManagerTargets(
  { limit: 500, cursor },
  accessToken,
);
```

See the [Go Extension reference](../../../reference/go/EXTENSIONS.md).
