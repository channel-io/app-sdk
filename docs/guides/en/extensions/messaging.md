# Messaging Extension

Messaging connects an external medium to Channel inbox and prebuilt-message flows. It is an
advanced integration because Extension Functions, channel permissions, provider webhooks, and
AppStore product setup have separate lifecycles.

## Decide the flow first

Choose inbox, prebuilt, or both. For each selected flow, define:

- provider identity and Channel user/chat mapping;
- inbound and outbound message ownership;
- supported writing types and optional editor/selector WAMs;
- required channel-scoped Native Function permissions;
- idempotency keys, ordering, retry, close/reopen, and partial-failure behavior.

## TypeScript

Declare `@Extension({ name: "messaging", systemVersion: "v1" })` and use the
`Messaging.inbox.*()` or `Messaging.prebuilt.*()` decorators. They bind the correct relative
Function name and schemas. See the
[TypeScript Messaging reference](../../../reference/typescript/extensions/messaging.md) for the
exact Function groups and DTOs.

## Go

```go
err := app.Use(messaging.Extension().
  InboxOnMediumMessageCreated(handler.OnMessage).
  InboxGetWritingTypes(handler.GetWritingTypes).
  InboxGetCustomEditorWAM(handler.GetEditor))
```

Add only the builder methods required by the selected flow. See the
[Go Extension reference](../../../reference/go/EXTENSIONS.md#builder-packages).

## Registration and security

SDK auto-registration publishes the `messaging:v1` Extension and its Function schemas. Additional
messaging product setup is an explicit AppStore configuration step; normal Extension registration
does not grant channel permissions automatically.

- Use channel tokens for server-side Channel operations.
- Keep provider credentials and tokens on the server.
- Validate WAM data and re-authorize server mutations.
- Deduplicate provider events before side effects.
- Test missing permissions, duplicates, provider rejection, retries, closed chats, and partial
  delivery without logging message content or contact data.
