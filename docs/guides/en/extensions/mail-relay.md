# Mail Relay Extension

Use Mail relay when normalized inbound mail events must invoke an app Function. The app owns
recipient interpretation, provider-specific parsing, deduplication, and downstream ingestion.

## Contract

The canonical Function is `extension.mailRelay.inbound.onMailReceived`; register `mailRelay:v1`.
The input points to the normalized envelope and raw-message storage object rather than embedding raw
MIME or attachments.

## Input and output

`MailRelayInboundInput` includes the app slug, representative recipient, all recipients, SES message
ID, raw-object bucket/key, normalized mail headers, and receipt verdict metadata. It does not contain
the raw MIME body.

Return `accepted`, `ignored`, `duplicate`, `retryableFailure`, or `permanentFailure` plus a stable
idempotency key when appropriate. Keep `reason` free of raw mail, attachment content, tokens, and
provider PII.

## TypeScript

TypeScript `0.17.2` does not accept `mailRelay` in `@Extension`. Register the full name as a
standalone `@Func`, validate with `MailRelayInboundInputSchema` and
`MailRelayInboundOutputSchema`, and call `NativeFunctionClient.registerExtension()` once with a
cached app token. See the complete [TypeScript Mail relay reference](../../../reference/typescript/extensions/mail-relay.md).

## Go

```go
err := app.Use(mailrelay.Extension().OnMailReceived(handler.OnMailReceived))
```

`server.WithAutoRegister()` can register the Go typed builder normally.

## Security and reliability

- Validate the relay token and recipient, bound body/attachment processing, and retrieve raw MIME
  only from the trusted object pointer.
- Deduplicate the SES message ID before side effects and return `duplicate` for repeats.
- Use `retryableFailure` only for temporary failures and `permanentFailure` for invalid events that
  must not retry.
- Do not log or return raw mail, attachment data, tokens, or provider PII. Test malformed recipients,
  duplicate delivery, missing objects, oversized mail, retry, and permanent rejection.

See the [Go Extension reference](../../../reference/go/EXTENSIONS.md).
