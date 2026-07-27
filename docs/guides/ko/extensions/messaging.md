# Messaging Extension

Messaging은 외부 medium을 Channel inbox와 prebuilt message 흐름에 연결합니다. Extension Function,
channel 권한, provider webhook, AppStore product 설정의 lifecycle이 서로 다르기 때문에 advanced
integration으로 다룹니다.

## 흐름부터 선택하기

Inbox, prebuilt 또는 둘 다를 선택합니다. 선택한 흐름마다 다음을 정의하세요.

- provider identity와 Channel user/chat mapping
- inbound/outbound message ownership
- 지원할 writing type과 선택적 editor/selector WAM
- 필요한 channel-scoped Native Function 권한
- idempotency key, 순서, 재시도, close/reopen, partial failure 정책

## TypeScript

`@Extension({ name: "messaging", systemVersion: "v1" })`을 선언하고
`Messaging.inbox.*()` 또는 `Messaging.prebuilt.*()` decorator를 사용합니다. 이 decorator는 정확한
relative Function 이름과 schema를 함께 적용합니다. Function group과 DTO는
[TypeScript Messaging 레퍼런스](../../../reference/typescript/extensions/messaging.md)를 확인하세요.

## Go

```go
err := app.Use(messaging.Extension().
  InboxOnMediumMessageCreated(handler.OnMessage).
  InboxGetWritingTypes(handler.GetWritingTypes).
  InboxGetCustomEditorWAM(handler.GetEditor))
```

선택한 흐름에 필요한 builder method만 추가합니다.
[Go Extension 레퍼런스](../../../reference/go/EXTENSIONS.md#builder-packages)도 확인하세요.

## 등록과 보안

SDK auto-registration은 `messaging:v1` Extension과 Function schema를 공개합니다. 추가 messaging
product setup은 명시적인 AppStore 설정 단계이며, 일반 Extension 등록이 channel 권한을 자동으로
부여하지는 않습니다.

- Server-side Channel operation에는 channel token을 사용합니다.
- Provider credential과 token은 서버에만 둡니다.
- WAM data를 검증하고 server mutation을 다시 인가합니다.
- Side effect 전에 provider event를 deduplicate합니다.
- Message/contact data를 로그로 남기지 말고 권한 누락, duplicate, provider rejection, retry,
  closed chat, partial delivery를 테스트합니다.
