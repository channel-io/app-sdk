# Mail Relay Extension

정규화된 inbound mail event가 app Function을 호출해야 할 때 사용합니다. Recipient 해석,
provider-specific parsing, deduplication, downstream ingestion은 앱이 담당합니다.

## 계약

Canonical Function은 `extension.mailRelay.inbound.onMailReceived`이고 `mailRelay:v1`을 등록합니다.
Input은 raw MIME나 attachment를 포함하지 않고 normalized envelope와 raw-message storage object를
가리킵니다.

## Input·output

`MailRelayInboundInput`은 app slug, 대표 recipient, 전체 recipient, SES message ID, raw-object
bucket/key, 정규화된 mail header, receipt verdict metadata를 포함합니다. Raw MIME body는 포함하지
않습니다.

상황에 따라 stable idempotency key와 함께 `accepted`, `ignored`, `duplicate`, `retryableFailure`,
`permanentFailure`를 반환합니다. `reason`에 raw mail, attachment content, token, provider PII를 넣지
않습니다.

## TypeScript

TypeScript `0.17.2`의 `@Extension`은 `mailRelay`를 허용하지 않습니다. 전체 이름을 standalone
`@Func`로 등록하고 `MailRelayInboundInputSchema`와 `MailRelayInboundOutputSchema`로 검증한 뒤 cached
app token으로 `NativeFunctionClient.registerExtension()`을 한 번 호출합니다.
[TypeScript Mail relay 레퍼런스](../../../reference/typescript/extensions/mail-relay.md)를 확인하세요.

## Go

```go
err := app.Use(mailrelay.Extension().OnMailReceived(handler.OnMailReceived))
```

Go typed builder는 `server.WithAutoRegister()`로 일반 등록할 수 있습니다.

## 보안·신뢰성

- Relay token과 recipient를 검증하고 body/attachment processing을 제한하며 trusted object pointer로만
  raw MIME을 가져옵니다.
- Side effect 전에 message ID를 deduplicate하고 반복 delivery에는 `duplicate`를 반환합니다.
- Temporary failure만 `retryableFailure`, 재시도하면 안 되는 invalid event는 `permanentFailure`로
  반환합니다.
- Raw mail, attachment data, token, provider PII를 log나 응답에 넣지 않습니다. Malformed recipient,
  duplicate, missing object, oversized mail, retry, permanent rejection을 테스트합니다.

[Go Extension 레퍼런스](../../../reference/go/EXTENSIONS.md)도 확인하세요.
