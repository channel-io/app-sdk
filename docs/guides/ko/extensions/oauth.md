# OAuth Extension

OAuth는 외부 provider의 Authorization Code flow에만 사용합니다. API key, `client_credentials`,
shop별 secret은 [Config](config.md)에 둡니다.

## 계약

| Function                                         | 필수 여부 | 역할                                   |
| ------------------------------------------------ | --------- | -------------------------------------- |
| `extension.oauth.metadata.getAuthConfig`         | 필수      | Provider와 authorization metadata 선언 |
| `extension.oauth.validation.validateCredentials` | 필수      | 연결된 provider token 검증             |

`oauth:v1`을 등록합니다. AppStore가 redirect state와 token exchange를 관리하고 client credential을
별도로 저장하며, 연결된 provider access token을 `ctx.authToken`으로 주입합니다.

## Metadata 모델

- `authType: "oauth"`, `authScope: "channel" | "manager"`, `oauthProvider`를 반환합니다.
- Provider metadata에는 안정적인 provider key, authorization/token URL, scope, fallback provider
  name을 넣습니다. Client ID/secret은 이 Function 밖에서 관리합니다.
- `parameterCase`는 표준 OAuth parameter case를, `authorizationOpenMode`는 popup/current-tab 동작을
  정합니다.
- Callback과 token request의 authorization-code field가 다르면 각각 설정합니다. 비표준 nested token
  response에만 dot-separated `tokenResponse` path를 사용합니다.
- `i18nMap`은 provider name/description을 번역하며 base text는 fallback으로 유지합니다.

## TypeScript

`@Extension({ name: "oauth", systemVersion: "v1" })`으로 `OAuthExtensionInterface`를 구현합니다.
Metadata는 `OAuthConfigSchema`, credential은 `CredentialValidationInputSchema`와
`CredentialValidationResultSchema`로 검증합니다. Metadata에 provider client secret을 반환하지
않습니다. 자세한 내용은 [TypeScript OAuth 레퍼런스](../../../reference/typescript/extensions/oauth.md)를
확인하세요.

## Go

```go
err := app.Use(oauth.Extension().
  GetAuthConfig(handler.GetAuthConfig).
  ValidateCredentials(handler.ValidateCredentials))
```

`extension/oauth` DTO를 사용하고 provider token은 app/channel token이 아니라 Function context에서
읽습니다.

## 인증·WAM·검증

- 공유 연결은 `channel`, 개인 연결은 `manager` scope를 사용합니다.
- WAM은 현재 surface가 허용하는 manager-scoped OAuth native Function만 호출합니다.
- `ctx.authToken`은 provider token이며 `TokenManager`가 발급하는 app/channel token과 다릅니다.
- 동의 거절, 잘못된 state, refresh 실패, 연결 해제, 만료 credential, WAM 권한 누락을 token log
  없이 테스트합니다.

## Lifecycle 복구

`oauth.connected`와 `oauth.disconnected` Hook에는 `actionFunctionName`과 선택적
`systemVersion`만 등록합니다. 두 lifecycle Hook에 `targetId`, `webhook`, endpoint token을
넣지 마세요. Manager event에서는 `params.managerId`로 manager를 식별합니다.
`context.caller`는 manager가 아니라 system caller이며, `oauth.connected`의
`context.authToken`은 새 provider access token입니다.

Manager `oauth.connected` Hook에 별도로 manager-scoped webhook target을 등록했다면
`context.webhooks?.[targetId]?.url`이 callback 등록의 선택적 fast path로 올 수 있습니다.
URL이 없을 수 있고 Hook delivery도 실패할 수 있으므로
`TokenManager.getAppToken()`의 app token으로 active manager target을 page하는 방식이 복구
경로입니다. Channel OAuth와 `oauth.disconnected`에서는 webhook URL을 기대하지 마세요.

```ts
const { accessToken } = await tokenManager.getAppToken();
const page = await nativeClient.listActiveOAuthManagerTargets(
  { limit: 500, cursor },
  accessToken,
);
```

[Go Extension 레퍼런스](../../../reference/go/EXTENSIONS.md)도 확인하세요.
