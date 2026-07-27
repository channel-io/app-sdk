# Hook Extension

App, command, config, widget lifecycle event 또는 공개 webhook event를 받을 때 사용합니다. Hook
metadata가 가리키는 handler는 standalone app Function이며 새 Extension Function이 아닙니다.

## 계약

`extension.hook.metadata.getHooks`가 필수입니다. 지원 type은 `app.installed`, `app.uninstalled`,
`command.toggle`, `config.saved`, `config.deleted`, `widget.installed`, `widget.uninstalled`,
`webhook.received`입니다.

Widget hook은 widget name과 같은 `targetId`가 필요합니다. App, command, Config hook에는 target을
넣지 않습니다. Public webhook target은 1-64자의 URL-safe identifier이고 endpoint token은
32-128자의 entropy 높은 URL-safe 문자열입니다. 다른 hook type에는 webhook object를 넣을 수 없습니다.

## TypeScript

`@Extension({ name: "hook", systemVersion: "v1" })`과 `GetHooksOutputSchema`를 사용하고 참조되는
handler는 standalone `@Func`로 등록합니다. 공개 webhook rule과 payload는
[TypeScript Hook 레퍼런스](../../../reference/typescript/extensions/hook.md)를 확인하세요.

## Go

```go
err := app.Use(hook.Extension().GetHooks(handler.GetHooks))
appsdk.MustRegister(app, "example.hook.receive", handler.Receive)
```

## 인증·신뢰성

- 일반 Function request는 raw body 기반 `x-signature` contract로 검증합니다.
- `webhook.received`에는 public stable `targetId`, entropy가 높은 endpoint token, provider payload
  검증, replay 방지, token rotation을 적용합니다.
- 느린 작업은 durable queue로 넘기고 빠르게 응답합니다. Delivery ID를 deduplicate하고 install,
  delete, provider event handler를 idempotent하게 만듭니다.
- Malformed payload, replay, partial failure, retry, uninstall cleanup, 공개 webhook의 channel context
  부재를 테스트합니다.

[Go Extension 레퍼런스](../../../reference/go/EXTENSIONS.md)도 확인하세요.
