# Extension Guide

This folder explains the extension contracts that the SDK can implement today.
All examples below assume the current public packages:

- `@channel.io/app-sdk-server`
- `@channel.io/app-sdk-wam`

## Current Recommendation

Use `@Extension`, `@Func`, and schema decorators from `@channel.io/app-sdk-server`.

## Extension Matrix

| Extension        | How to implement it today                      | Registration path                                                     | Extra native functions after registration                                                               | Working reference                                                                             |
| ---------------- | ---------------------------------------------- | --------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------- |
| Config           | decorators                                     | `registerExtension("config", "v1")`                                   | config-scoped read/save/validate/delete helpers are expected to back setup WAMs                         | [config.md](./config.md)                                                                      |
| Command          | decorators                                     | `registerExtension("command", "v1")`                                  | none in the SDK surface for normal execution                                                            | [command.md](./command.md), [examples/basic](../../../../ts/examples/basic/README.md)         |
| OAuth            | decorators                                     | `registerExtension("oauth", "v1")`                                    | `getOAuthConfig`, `getOAuthConnection`, `getOAuthAuthorizationURL`, `disconnectOAuth`                   | [oauth.md](./oauth.md)                                                                        |
| Calendar         | decorators                                     | `registerExtension("calendar", "v1")`                                 | usually none beyond app functions                                                                       | [calendar.md](./calendar.md), [examples/calendar](../../../../ts/examples/calendar/README.md) |
| Widget           | decorators                                     | `registerExtension("widget", "v1")`                                   | none in normal widget runtime; widget install hooks are separate hook metadata                          | [widget.md](./widget.md)                                                                      |
| Custom tab       | decorators                                     | `registerExtension("customtab", "v1")`                                | none in normal runtime                                                                                  | [customtab.md](./customtab.md)                                                                |
| Hook             | decorators                                     | `registerExtension("hook", "v1")`                                     | no extra SDK helper; handlers are normal app functions                                                  | [hook.md](./hook.md)                                                                          |
| Mail relay       | standalone full-name `@Func`                   | explicit `registerExtension("mailRelay", "v1")`                       | relay forwards `{slug}.mail.channel.io` events to AppStore, which resolves and invokes the app Function | [mail-relay.md](./mail-relay.md)                                                              |
| Polling          | decorators                                     | `registerExtension("polling", "v1")`                                  | target resolver returns channel pages; poller handlers are normal app functions                         | [polling.md](./polling.md)                                                                    |
| Store            | decorators                                     | `registerExtension("store", "v1")`                                    | none in normal runtime; AppStore reads the profile during registration/sync                             | [store.md](./store.md)                                                                        |
| DataSource       | decorators                                     | `registerExtension("datasource", "v1")`                               | query execution uses datasource gRPC; optional runners support PostgreSQL and BigQuery Storage + Arrow  | [datasource.md](./datasource.md)                                                              |
| Commerce         | decorators and canonical schemas               | `registerExtension("commerce", "v1")`                                 | none beyond app Functions                                                                               | [Commerce recipe](../../../guides/en/extensions/commerce.md)                                  |
| WMS              | decorators and canonical schemas               | `registerExtension("wms", "v1")`                                      | none beyond app Functions                                                                               | [WMS recipe](../../../guides/en/extensions/wms.md)                                            |
| Messaging family | decorators, typed schemas, coordinated rollout | generic `messaging` registration plus AppStore subfamily registration | channel-scoped runtime native functions are required for inbox messaging                                | [messaging.md](./messaging.md)                                                                |
| ALF task         | decorators                                     | `registerExtension("alfTask", "v1")` plus task sync                   | `registerAlfTasks`, `getAlfTaskVersions`                                                                | [alf-task.md](./alf-task.md)                                                                  |
| Notebook         | decorators                                     | `registerExtension("notebook", "v1")` plus notebook sync              | `registerAppNotebooks`, `getAppNotebookVersions`                                                        | [notebook.md](./notebook.md)                                                                  |

## Notes

- Command, widget, custom tab, hook, and polling are metadata-driven. AppStore reads their metadata functions during registration.
- Mail relay is relay-driven at runtime. TypeScript `0.17.2` requires a standalone full-name Function plus explicit registration because `mailRelay` is not accepted by `@Extension`.
- OAuth is an auth Extension. Use Config for setup UI, stored credentials, validation, and
  app-specific configuration.
- DataSource metadata is JSON-RPC; query execution is handled by the app server datasource gRPC endpoint. PostgreSQL, BigQuery, and Arrow packages are optional peer dependencies and are loaded only by the runner that uses them.
- Messaging has decorator routing, schemas, and interfaces, but AppStore still coordinates several
  subfamily registrations and native claims separately. Treat it as an advanced integration and do
  not assume generic registration alone completes rollout.
- Notebook apps expose app-managed notebook definitions. AppStore owns extension registration and native proxying; Channel owns notebook storage, revisioning, sync, and UI.
