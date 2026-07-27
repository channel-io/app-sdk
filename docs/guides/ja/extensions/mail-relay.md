# Mail Relay Extension

正規化された inbound mail event から app Function を呼ぶときに使います。Recipient 解釈、
provider-specific parsing、deduplication、downstream ingestion はアプリが担当します。

## Contract

Canonical Function は `extension.mailRelay.inbound.onMailReceived` で、`mailRelay:v1` を登録します。
Input は raw MIME/attachment を含まず、normalized envelope と raw-message storage object を指します。

## Input・output

`MailRelayInboundInput` は app slug、代表 recipient、全 recipient、SES message ID、raw-object
bucket/key、normalized mail header、receipt verdict metadata を含みます。Raw MIME body は含みません。

必要に応じて stable idempotency key とともに `accepted`、`ignored`、`duplicate`、
`retryableFailure`、`permanentFailure` を返します。`reason` に raw mail、attachment content、
token、provider PII を含めません。

## TypeScript

TypeScript `0.17.2` の `@Extension` は `mailRelay` を許可しません。Full name を standalone
`@Func` で登録し、`MailRelayInboundInputSchema` と `MailRelayInboundOutputSchema` で検証してから、
cached app token で `NativeFunctionClient.registerExtension()` を一度呼びます。
[TypeScript Mail relay reference](../../../reference/typescript/extensions/mail-relay.md) を参照してください。

## Go

```go
err := app.Use(mailrelay.Extension().OnMailReceived(handler.OnMailReceived))
```

Go typed builder は `server.WithAutoRegister()` で通常どおり登録できます。

## Security・信頼性

- Relay token と recipient を検証し、body/attachment processing を制限し、trusted object pointer
  からだけ raw MIME を取得します。
- Side effect 前に message ID を deduplicate し、再配信には `duplicate` を返します。
- Temporary failure だけを `retryableFailure`、retry 不可の invalid event を
  `permanentFailure` にします。
- Raw mail、attachment data、token、provider PII を log/response に含めません。Malformed recipient、
  duplicate、missing object、oversized mail、retry、permanent rejection を test します。

[Go Extension reference](../../../reference/go/EXTENSIONS.md) も参照してください。
