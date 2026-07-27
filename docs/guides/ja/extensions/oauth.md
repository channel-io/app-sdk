# OAuth Extension

OAuth は外部 provider の Authorization Code flow にだけ使います。API key、
`client_credentials`、shop ごとの secret は [Config](config.md) に保存します。

## Contract

| Function                                         | 必須 | 役割                                      |
| ------------------------------------------------ | ---- | ----------------------------------------- |
| `extension.oauth.metadata.getAuthConfig`         | 必須 | Provider と authorization metadata を宣言 |
| `extension.oauth.validation.validateCredentials` | 必須 | 接続済み provider token を検証            |

`oauth:v1` を登録します。AppStore が redirect state と token exchange を管理し、client credential
を別に保存し、provider access token を `ctx.authToken` に注入します。

## Metadata model

- `authType: "oauth"`、`authScope: "channel" | "manager"`、`oauthProvider` を返します。
- Provider metadata には stable provider key、authorization/token URL、scope、fallback provider
  name を含めます。Client ID/secret はこの Function の外で管理します。
- `parameterCase` は標準 OAuth parameter case、`authorizationOpenMode` は popup/current-tab behavior
  を設定します。
- Callback と token request の authorization-code field が異なる場合は別々に設定します。非標準の
  nested token response にだけ dot-separated `tokenResponse` path を使います。
- `i18nMap` は provider name/description を翻訳し、base text は fallback として残します。

## TypeScript

`@Extension({ name: "oauth", systemVersion: "v1" })` で `OAuthExtensionInterface` を実装します。
Metadata は `OAuthConfigSchema`、credential は `CredentialValidationInputSchema` と
`CredentialValidationResultSchema` で検証します。Metadata から provider client secret を返しません。
詳細は [TypeScript OAuth reference](../../../reference/typescript/extensions/oauth.md) を参照してください。

## Go

```go
err := app.Use(oauth.Extension().
  GetAuthConfig(handler.GetAuthConfig).
  ValidateCredentials(handler.ValidateCredentials))
```

`extension/oauth` DTO を使い、provider token は app/channel token ではなく Function context から
読みます。

## 認証・WAM・検証

- 共有接続は `channel`、個人接続は `manager` scope を使います。
- WAM は現在の surface が許可する manager-scoped OAuth native Function だけを呼び出します。
- `ctx.authToken` は provider token で、`TokenManager` の app/channel token とは異なります。
- Consent 拒否、不正 state、refresh failure、disconnect、credential expiry、WAM authorization 不足を
  token を log せず test します。

[Go Extension reference](../../../reference/go/EXTENSIONS.md) も参照してください。
