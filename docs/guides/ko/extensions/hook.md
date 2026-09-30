# Hook Extension

선택적 `oauth.beforeAuthorization`, `oauth.afterAuthorization`도 기존 `getHooks`로
등록합니다. 두 타입은 canonical HTTPS origin만 담은 `redirectOrigins`가 필요하며,
계속 진행만 하는 훅은 빈 배열을 사용합니다. `OAuthFlowHookInputSchema`의 입력은
`{ flowId, resumeUrl, expiresAt }`, `OAuthFlowHookResultSchema`의 결과는 strict union인
`{ type: "continue" } | { type: "redirect", url }`입니다. 같은 시스템 훅이 인증된
사용자의 재개 시 다시 호출되므로 외부 상태를 재검증해야 합니다. before에는 제공자
토큰이 없고 after에는 새로 저장한 토큰이 전달됩니다. 후속 설정 중에도 OAuth는
사용할 수 있습니다. 권한·동의는 실제 매니저 액션에서 저장하고 훅은 완료 기록을
조회합니다. 재개 재시도, 잘못된 origin과 결과 형식을 테스트하세요.
자세한 계약은 [Hook reference](../../../reference/typescript/extensions/hook.md#optional-oauth-flow-hooks)를 참고하세요.

App, command, config, widget lifecycle event 또는 공개 webhook event를 받을 때 사용합니다. Hook
metadata가 가리키는 handler는 standalone app Function이며 새 Extension Function이 아닙니다.

## 계약

`extension.hook.metadata.getHooks`가 필수입니다. 지원 type은 `app.installed`, `app.uninstalled`,
`command.toggle`, `config.saved`, `config.deleted`, `widget.installed`, `widget.uninstalled`,
`webhook.received`, `oauth.connected`, `oauth.disconnected`, `oauth.beforeAuthorization`,
`oauth.afterAuthorization`, `userChat.opened`,
`teamChat.messageCreated`입니다.

Widget hook은 widget name과 같은 `targetId`가 필요합니다. App, command, Config hook에는 target을
넣지 않습니다. Public webhook target은 1-64자의 URL-safe identifier입니다. `executionScope`의
기본값은 `app`이며 32-128자의 entropy 높은 `endpointToken`이 필요합니다. Manager scope에서는
AppStore가 설치·Channel·manager에 binding된 URL을 발급하므로 token을 넣지 않습니다. 다른 hook
type에는 webhook object를 넣을 수 없습니다.
`teamChat.messageCreated`에는 target metadata가 없고 보관되지 않은 public TeamChat group에 commit된
모든 root/reply를 전체 Channel Message snapshot과 함께 전달합니다. 앱은 snapshot의 `personType`과
`personId`에서 작성자를, `rootMessageId`에서 thread 관계를, `plainText`와 `blocks`에서 콘텐츠를 읽어
자체 eligibility rule을 적용합니다. 정확한 DTO는 TypeScript 레퍼런스를 확인하세요.

## TypeScript

`@Extension({ name: "hook", systemVersion: "v1" })`과 `GetHooksOutputSchema`를 사용하고 참조되는
handler는 standalone `@Func`로 등록합니다. 공개 webhook rule과 payload는
[TypeScript Hook 레퍼런스](../../../reference/typescript/extensions/hook.md)를 확인하세요.
Manager scope에서는 manager의 connect Function에서 `context.webhooks[targetId].url`을 읽어
provider에 등록합니다. Hook 정의 자체는 계속 app-level입니다.

## Go

```go
err := app.Use(hook.Extension().GetHooks(handler.GetHooks))
appsdk.MustRegister(app, "example.hook.receive", handler.Receive)
```

## 인증·신뢰성

- 일반 Function request는 raw body 기반 `x-signature` contract로 검증합니다.
- App-scoped `webhook.received`에는 public stable `targetId`, entropy가 높은 endpoint token,
  provider payload 검증, replay 방지, token rotation을 적용합니다.
- Manager scope에서는 서명 검증된 Function context의 manager와 Channel만 신뢰합니다. Provider
  payload, header, query parameter로 실행 주체를 선택하지 않습니다.
- 느린 작업은 durable queue로 넘기고 빠르게 응답합니다. Delivery ID를 deduplicate하고 install,
  delete, provider event handler를 idempotent하게 만듭니다.
- Malformed payload, replay, partial failure, retry, uninstall 시 binding 폐기, app-level 호출의
  Channel context 부재, manager 호출의 binding context를 테스트합니다.

[Go Extension 레퍼런스](../../../reference/go/EXTENSIONS.md)도 확인하세요.

## Webhook 고정 접수 응답

앱 범위와 매니저 범위 모두 선택적 `webhook.response`를 지원합니다. 필수
`statusCode`(200~299), `contentType`(개행 없는 유효 MIME 타입), 선택적 문자열
`body`(UTF-8 기준 최대 64 KiB)를 지정합니다. 본문을 생략하면 빈 문자열이며
204와 205에는 빈 본문만 허용합니다. outbox 저장 성공 후 본문 그대로 응답하며
앱 업무 처리 완료를 의미하지 않습니다. 기존 오류 응답과 비동기 재시도는 유지합니다.

등록 또는 재등록 시 `response`를 생략하면 기본 202 JSON 응답(`deliveryId`,
`status`)을 사용합니다. 고정 응답에는 `deliveryId`를 자동 삽입하지 않지만
내부 추적에는 유지합니다. XML 입력은 이미 `rawBodyBase64`로 전달됩니다.
DB migration과 전체 서버 배포 후 새 SDK 설정을 사용하세요.
XML·빈 응답·설정 제거는 [고정 응답 예시](../../../reference/typescript/extensions/hook.md#fixed-acknowledgement-response)를 참고하세요.
