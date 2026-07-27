# Extension Recipe Router

Choose one family and one human language before implementing it. Read the matching file under:

```text
docs/guides/{en|ko|ja}/extensions/{recipe}.md
```

Then read the TypeScript or Go language reference linked by that recipe. Do not load every family
recipe when the task uses only one Extension.

| Extension  | Recipe          | Important branch                                                                 |
| ---------- | --------------- | -------------------------------------------------------------------------------- |
| Config     | `config.md`     | Preferred setup and credential surface                                           |
| OAuth      | `oauth.md`      | Authorization Code only                                                          |
| Command    | `command.md`    | Metadata plus referenced action Function                                         |
| Widget     | `widget.md`     | Surface metadata plus optional WAM action                                        |
| Custom tab | `customtab.md`  | Persistent Desk WAM surface                                                      |
| Hook       | `hook.md`       | Lifecycle or public webhook delivery                                             |
| Polling    | `polling.md`    | Scheduler metadata, target paging, durable cursor                                |
| Calendar   | `calendar.md`   | Availability and booking operations                                              |
| Store      | `store.md`      | App Store presentation metadata                                                  |
| DataSource | `datasource.md` | JSON-RPC metadata plus authenticated gRPC queries                                |
| Commerce   | `commerce.md`   | Current ID-based commerce contract                                               |
| WMS        | `wms.md`        | Prefer the ID-based `order.*` group                                              |
| Messaging  | `messaging.md`  | Advanced AppStore-driven family; registration alias differs from Function prefix |
| ALF task   | `alf-task.md`   | Extension registration plus task sync                                            |
| Notebook   | `notebook.md`   | Extension registration plus notebook sync                                        |
| Mail relay | `mail-relay.md` | TypeScript standalone full-name Function                                         |

For TypeScript, also read `docs/reference/typescript/EXTENSIONS.md` and the family reference under
`docs/reference/typescript/extensions/`. For Go, read `docs/reference/go/EXTENSIONS.md` and
`docs/reference/go/EXTENSIONS.md`.

Treat the recipe's support note as a constraint. Do not invent a typed wrapper when the selected SDK
does not expose one; isolate a documented protocol fallback and report it explicitly.
