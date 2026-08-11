# Channel.io App SDK Agent Guide

This repository is meant to be usable without external developer docs.
If you are building or reviewing a Channel.io app, start from the files below in this order.

## Start Here

1. [README.md](./README.md)
2. [docs/guides/en/quickstart.md](./docs/guides/en/quickstart.md) for a new app
3. [docs/guides/en/concepts.md](./docs/guides/en/concepts.md)
4. [docs/guides/en/functions.md](./docs/guides/en/functions.md)
5. [docs/guides/en/extensions/command.md](./docs/guides/en/extensions/command.md)
6. [docs/guides/en/wam.md](./docs/guides/en/wam.md)
7. [docs/guides/en/extensions.md](./docs/guides/en/extensions.md)
8. [docs/guides/en/app-development.md](./docs/guides/en/app-development.md)
9. Language reference:
   - TypeScript: [docs/reference/typescript/README.md](./docs/reference/typescript/README.md)
   - Go: [docs/reference/go/README.md](./docs/reference/go/README.md)
10. Examples:

- [ts/examples/basic/README.md](./ts/examples/basic/README.md)
- [ts/examples/calendar/README.md](./ts/examples/calendar/README.md)
- [TypeScript app tutorial](https://github.com/channel-io/app-tutorial-ts)
- [Go app tutorial](https://github.com/channel-io/app-tutorial)

## Source Of Truth

When documentation and examples disagree, trust the code in this order:

1. Public package exports
   - [ts/packages/core/src/index.ts](./ts/packages/core/src/index.ts)
   - [ts/packages/server/src/index.ts](./ts/packages/server/src/index.ts)
   - [ts/packages/wam/src/index.ts](./ts/packages/wam/src/index.ts)
2. Extension schemas and interfaces
   - [ts/packages/core/src/extensions](./ts/packages/core/src/extensions)
   - [ts/packages/core/src/extensions/interfaces](./ts/packages/core/src/extensions/interfaces)
3. Registration and token flow
   - [ts/packages/server/src/native/client.ts](./ts/packages/server/src/native/client.ts)
   - [ts/packages/server/src/token/manager.ts](./ts/packages/server/src/token/manager.ts)
   - [ts/packages/server/src/nestjs/channel-app.service.ts](./ts/packages/server/src/nestjs/channel-app.service.ts)
4. WAM runtime behavior
   - [ts/packages/wam/src/hooks](./ts/packages/wam/src/hooks)
   - [ts/packages/wam/src/components](./ts/packages/wam/src/components)

## Recommended Build Path

- Server extensions:
  Use `@Extension`, `@Func`, and schema decorators from `@channel.io/app-sdk-server`.
- Auto-registration:
  Use `ChannelAppModule.forRoot({ autoRegister: true })` and list decorated extension classes in the NestJS module's `providers`.
- Token lifecycle:
  Use `TokenManager`; NestJS auto-registration uses that shared manager. Do not call `issueToken()` on every request.
- WAM:
  Use `@channel.io/app-sdk-wam` and return WAM action payloads from command, widget, or custom tab handlers.

## Important Current Caveats

- `create` generates the maintained TypeScript starter. Treat the language reference and public
  package exports as the contract when extending it.
- `add extension` snippets are conveniences; cross-check the selected Extension family reference.
- Messaging subfamilies require coordinated AppStore registration and native claims in addition to
  their typed Functions. Follow [the messaging contract](./docs/reference/typescript/extensions/messaging.md).
- OAuth flows depend on native Functions in addition to Extension registration. ALF Task and
  Notebook registration use the common `registerExtension` flow. Read the Extension-specific docs
  before implementing them.

## Doc Map

- TypeScript reference map: [docs/reference/typescript/README.md](./docs/reference/typescript/README.md)
- Auth and token flow: [docs/reference/typescript/AUTH-AND-TOKENS.md](./docs/reference/typescript/AUTH-AND-TOKENS.md)
- Extension overview: [docs/reference/typescript/extensions/README.md](./docs/reference/typescript/extensions/README.md)
- Command: [docs/reference/typescript/extensions/command.md](./docs/reference/typescript/extensions/command.md)
- Localized Command guide: [docs/guides/en/extensions/command.md](./docs/guides/en/extensions/command.md)
- OAuth: [docs/reference/typescript/extensions/oauth.md](./docs/reference/typescript/extensions/oauth.md)
- Calendar: [docs/reference/typescript/extensions/calendar.md](./docs/reference/typescript/extensions/calendar.md)
- Widget: [docs/reference/typescript/extensions/widget.md](./docs/reference/typescript/extensions/widget.md)
- Custom tab: [docs/reference/typescript/extensions/customtab.md](./docs/reference/typescript/extensions/customtab.md)
- Hook: [docs/reference/typescript/extensions/hook.md](./docs/reference/typescript/extensions/hook.md)
- Messaging family: [docs/reference/typescript/extensions/messaging.md](./docs/reference/typescript/extensions/messaging.md)
- ALF task: [docs/reference/typescript/extensions/alf-task.md](./docs/reference/typescript/extensions/alf-task.md)
- WAM: [docs/reference/typescript/WAM.md](./docs/reference/typescript/WAM.md)
- Localized WAM guide: [docs/guides/en/wam.md](./docs/guides/en/wam.md)
- Go overview: [docs/reference/go/README.md](./docs/reference/go/README.md)
- Go auth and token flow: [docs/reference/go/AUTH-AND-TOKENS.md](./docs/reference/go/AUTH-AND-TOKENS.md)
- Go server and routing: [docs/reference/go/SERVER.md](./docs/reference/go/SERVER.md)
- Go native functions: [docs/reference/go/NATIVE.md](./docs/reference/go/NATIVE.md)
