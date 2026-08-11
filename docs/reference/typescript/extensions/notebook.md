# Notebook Extension

Use the Notebook extension when your app should publish app-managed notebook
definitions to Channel's notebook feature.

## Required Function

- `extension.notebook.core.getNotebooks`

The Function group is `core` and the Function is `getNotebooks`. Current NestJS apps should use decorators; the lower-level `createNotebookExtensionV1()` export builds an `ExtensionDefinition` that `ChannelAppModule` does not consume directly.

```typescript
import {
  Extension,
  Func,
  GetNotebooksInputSchema,
  GetNotebooksResponseSchema,
  InputSchema,
  NotebookFunctionNames,
  OutputSchema,
} from "@channel.io/app-sdk-server";

@Extension({ name: "notebook", systemVersion: "v1" })
export class NotebookExtension {
  @Func(NotebookFunctionNames.getNotebooks)
  @InputSchema(GetNotebooksInputSchema)
  @OutputSchema(GetNotebooksResponseSchema)
  async getNotebooks() {
    return {
      notebooks: [
        {
          notebookKey: "sales-dashboard",
          version: 1,
          title: "Sales Dashboard",
          initialVisibility: "visible",
          notebook: {
            cells: [
              {
                cellKey: "intro",
                type: "markdown",
                definition: { markdown: "# Sales Dashboard" },
              },
            ],
          },
        },
      ],
    };
  }
}
```

List `NotebookExtension` in the NestJS module's `providers` so the SDK can discover it.

## Registration

Use the common `registerExtension("notebook", "v1")` flow. A successful registration also asks
Channel's notebook service to synchronize the latest `getNotebooks` result. Re-register the same
extension after changing its notebook definitions.

Use `getAppNotebookVersions(appId, accessToken)` when you need to inspect the
latest synced notebook versions.

AppStore owns extension registration and version-read proxying. Channel owns
notebook storage, revision history, sync runs, and UI presentation.
