# Hook Extension

Use Hook for app, command, config, widget, or public webhook lifecycle events. Hook metadata points
to ordinary app Functions; it does not turn those handlers into new Extension Functions.

## Contract

`extension.hook.metadata.getHooks` is required. Supported types are `app.installed`,
`app.uninstalled`, `command.toggle`, `config.saved`, `config.deleted`, `widget.installed`,
`widget.uninstalled`, and `webhook.received`.

Widget hooks require a `targetId` matching the widget name. App, command, and Config hooks must not
set a target. A public webhook target is 1-64 URL-safe identifier characters and its endpoint token
is 32-128 URL-safe high-entropy characters; the webhook object is invalid on every other hook type.

## TypeScript

Use `@Extension({ name: "hook", systemVersion: "v1" })` and validate metadata with
`GetHooksOutputSchema`. Register each referenced handler as a standalone `@Func`. Public webhook
rules and payload fields are in the [TypeScript Hook reference](../../../reference/typescript/extensions/hook.md).

## Go

```go
err := app.Use(hook.Extension().GetHooks(handler.GetHooks))
appsdk.MustRegister(app, "example.hook.receive", handler.Receive)
```

## Authentication and reliability

- Verify all normal Function requests with the raw-body `x-signature` contract.
- For `webhook.received`, use a public stable `targetId`, a high-entropy endpoint token, provider
  payload validation, replay protection, and token rotation.
- Return quickly and move slow work to a durable queue. Deduplicate delivery IDs and make install,
  delete, and provider-event handlers idempotent.
- Test malformed payloads, replay, partial failure, retry, uninstall cleanup, and missing channel
  context for public webhook calls.

See the [Go Extension reference](../../../reference/go/EXTENSIONS.md).
