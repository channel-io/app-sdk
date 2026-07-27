# Widget Extension

Use Widget to add context-sensitive UI or actions to a supported Desk or front surface.

## Contract

| Function                               | Requirement | Purpose                               |
| -------------------------------------- | ----------- | ------------------------------------- |
| `extension.widget.metadata.getWidgets` | Required    | Publishes surface and action metadata |
| Metadata's `actionFunctionName`        | Per widget  | Returns an action result, often a WAM |

Chat, user, and manager fields vary by surface. Treat them as optional until the selected surface's
public contract guarantees them.

Return at most 30 widgets. A widget name is 1-20 ASCII letters, `_`, or `-`; scope is `front` or
`desk`; and `widgetType` is `wam` or the Desk-only `snippet`. Use stable names, localize display
name/description, and use the dedicated snippet registration contract when `snippetApiUrl` is
required.

## TypeScript

Use `@Extension({ name: "widget", systemVersion: "v1" })` for metadata and a standalone action
Function. Validate with `GetWidgetsOutputSchema` and `WidgetActionResultSchema`. See the
[TypeScript Widget reference](../../../reference/typescript/extensions/widget.md).

## Go

```go
err := app.Use(widget.Extension().
  GetWidgets(handler.GetWidgets).
  Action("example.widget.open", handler.Open))
```

## Authentication, WAM, and reliability

- Use a WAM for interactive content; keep provider credentials and privileged tokens on the server.
- Validate any resource identifier received from the browser before using an app/channel token.
- Pair with Hook only when widget installation or removal needs lifecycle work.
- Test every declared surface, absent optional context, permission denial, loading/error UI, and
  duplicate clicks.

See the [WAM reference](../../../reference/typescript/WAM.md) and
[Go Extension reference](../../../reference/go/EXTENSIONS.md).
