# Basic TypeScript Example

A minimal NestJS app using the current public decorator API.

## Features

- `@Extension({ name: "command", systemVersion: "v1" })`
- command metadata at `extension.command.metadata.getCommands`
- typed command action at `extension.command.command.execute`
- React WAM using `WamProvider` and SDK hooks

## Run

```bash
pnpm install
cp .env.example .env
pnpm dev
```

Add `autoRegister: true` to `ChannelAppModule` when connecting the example to AppStore. The current source files are the reference:

- [server module](apps/server/src/app.module.ts)
- [command extension](apps/server/src/extensions/command.extension.ts)
- [WAM app](apps/wam/src/App.tsx)

AppStore discovers command definitions through the Extension metadata Function.
