# Hook Extension

App, command, config, widget lifecycle event 또는 공개 webhook event를 받을 때 사용합니다. Hook
metadata가 가리키는 handler는 standalone app Function이며 새 Extension Function이 아닙니다.

## 계약

`extension.hook.metadata.getHooks`가 필수입니다. 지원 type은 `app.installed`, `app.uninstalled`,
`command.toggle`, `config.saved`, `config.deleted`, `widget.installed`, `widget.uninstalled`,
`webhook.received`입니다.

Widget hook은 widget name과 같은 `targetId`가 필요합니다. App, command, Config hook에는 target을
넣지 않습니다. Public webhook target은 1-64자의 URL-safe identifier입니다. `executionScope`의
기본값은 `app`이며 32-128자의 entropy 높은 `endpointToken`이 필요합니다. Manager scope에서는
AppStore가 설치·Channel·manager에 binding된 URL을 발급하므로 token을 넣지 않습니다. 다른 hook
type에는 webhook object를 넣을 수 없습니다.

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
