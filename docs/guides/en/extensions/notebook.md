# Notebook Extension

Use Notebook to publish versioned, app-managed notebook and cell definitions.

## Contract

`extension.notebook.core.getNotebooks` is required. Register `notebook:v1` through the common
`registerExtension` flow. Successful registration also triggers definition synchronization.

Each notebook has a stable key, positive integer version, title, optional initial visibility, and
cells. Supported cell types are `markdown`, `sql`, `python`, `input`, `chart`, `table`, and
`single_value`; optional tabs and row/column layouts reference stable cell keys.

## TypeScript

Use `@Extension({ name: "notebook", systemVersion: "v1" })` with
`GetNotebooksInputSchema` and `GetNotebooksResponseSchema`. Keep notebook and cell keys stable. See
the [TypeScript Notebook reference](../../../reference/typescript/extensions/notebook.md).

## Go

```go
err := app.Use(notebook.Extension().GetNotebooks(handler.GetNotebooks))
```

Auto-registration uses the same common `registerExtension` flow and triggers notebook sync.

## Security and verification

- Increment versions when definitions change; do not reuse a version for different content.
- Treat externally sourced Markdown, URLs, and rendered data as untrusted.
- Keep credentials and private records out of definitions and cells.
- Test discovery, extension registration and sync, version readback, invalid cells, deleted
  notebooks, localization, and safe rendering.

See the [Go native reference](../../../reference/go/NATIVE.md).
