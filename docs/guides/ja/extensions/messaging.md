# Messaging Extension

Messaging は external medium を Channel inbox / prebuilt message flow に接続します。Extension
Function、channel permission、provider webhook、AppStore product setup の lifecycle が別なので、
advanced integration として扱います。

## Flow を先に選ぶ

Inbox、prebuilt、または両方を選び、各 flow について次を定義します。

- provider identity と Channel user/chat mapping
- inbound/outbound message ownership
- writing type と optional editor/selector WAM
- 必要な channel-scoped Native Function permission
- idempotency key、ordering、retry、close/reopen、partial failure

## TypeScript

`@Extension({ name: "messaging", systemVersion: "v1" })` を宣言し、
`Messaging.inbox.*()` または `Messaging.prebuilt.*()` decorator を使います。正しい relative
Function name と schema が同時に設定されます。Function group と DTO は
[TypeScript Messaging reference](../../../reference/typescript/extensions/messaging.md) を確認してください。

## Go

```go
err := app.Use(messaging.Extension().
  InboxOnMediumMessageCreated(handler.OnMessage).
  InboxGetWritingTypes(handler.GetWritingTypes).
  InboxGetCustomEditorWAM(handler.GetEditor))
```

選択した flow に必要な builder method だけを追加します。
[Go Extension reference](../../../reference/go/EXTENSIONS.md#builder-packages) も確認してください。

## Registration と security

SDK auto-registration は `messaging:v1` Extension と Function schema を公開します。追加の
messaging product setup は明示的な AppStore configuration step であり、通常の Extension
registration が channel permission を自動付与するわけではありません。

- Server-side Channel operation には channel token を使います。
- Provider credential と token は server にだけ置きます。
- WAM data を validation し、server mutation を再認可します。
- Side effect の前に provider event を deduplicate します。
- Message/contact data を log に残さず、missing permission、duplicate、provider rejection、retry、
  closed chat、partial delivery を test します。
