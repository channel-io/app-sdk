# Custom Tab Extension

Use Custom tab for a persistent, app-owned Desk surface that needs more room or longer-lived state
than a command or widget action.

## Contract

| Function                                     | Requirement | Purpose                          |
| -------------------------------------------- | ----------- | -------------------------------- |
| `extension.customtab.metadata.getCustomTabs` | Required    | Publishes stable tab definitions |
| Metadata's `actionFunctionName`              | Per tab     | Opens or prepares the tab's WAM  |

Keep tab keys stable across releases. Do not localize keys or Function names; localize display text.

Return at most five tabs. A tab name is 1-30 ASCII letters, `_`, or `-`, and each definition contains
an action Function, optional system version, and optional locale-to-name map.

## TypeScript

Use `@Extension({ name: "customtab", systemVersion: "v1" })` for metadata and a standalone action
Function. Validate with `GetCustomTabsOutputSchema` and `CustomTabActionResultSchema`. See the
[TypeScript Custom tab reference](../../../reference/typescript/extensions/customtab.md).

## Go

```go
err := app.Use(customtab.Extension().
  GetCustomTabs(handler.GetCustomTabs).
  Action("example.tab.open", handler.Open))
```

## Authentication, WAM, and reliability

- Serve the tab from the configured WAM root and return only the WAM name and safe `wamArgs`.
- Re-authorize privileged server operations for every call; a visible tab is not proof of access.
- Preserve tab state deliberately and handle host navigation, remounts, unsupported surfaces, and
  expired context.
- Test registration, tab visibility, WAM load, permissions, refresh, and error recovery.

See the [WAM reference](../../../reference/typescript/WAM.md).
