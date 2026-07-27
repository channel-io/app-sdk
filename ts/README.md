# TypeScript SDK

The TypeScript packages provide a NestJS app server, typed Function and Extension contracts,
token/native clients, React WAM hooks, and WAM-specific UI infrastructure.

## Start here

1. Build the first complete app with the [Quickstart](../docs/guides/en/quickstart.md).
2. Keep the [TypeScript tutorial](https://github.com/channel-io/app-tutorial-ts) open as a runnable
   server, shared-contract, and React WAM example.
3. Use the [TypeScript reference map](../docs/reference/typescript/README.md) for exact APIs.
4. Choose a family from the [Extension reference](../docs/reference/typescript/extensions/README.md).

## Packages

| Package                      | Responsibility                                                 |
| ---------------------------- | -------------------------------------------------------------- |
| `@channel.io/app-sdk-server` | NestJS Functions, Extensions, signatures, tokens, native calls |
| `@channel.io/app-sdk-core`   | Shared TypeScript types, schemas, and lower-level definitions  |
| `@channel.io/app-sdk-wam`    | React WAM data, sizing, closing, app/native calls              |
| `@channel.io/app-sdk-wam-ui` | WAM theme, layout, states, and Bezier presets                  |
| `@channel.io/app-sdk`        | CLI entry point and compatibility exports                      |

Install only the packages used by each workspace:

```sh
npm install @channel.io/app-sdk-server
npm install @channel.io/app-sdk-wam @channel.io/app-sdk-wam-ui
```

## Scaffold a starter

The CLI creates a secure NestJS server, command Extension, shared Zod package, and React WAM:

```sh
npx @channel.io/app-sdk create my-app
cd my-app
corepack pnpm install
cp apps/server/.env.example apps/server/.env
corepack pnpm build
```

The generated project is a compact starting point. The Quickstart explains credentials,
permissions, HTTPS endpoints, installation, and end-to-end verification; the tutorial demonstrates
the fuller bot/manager message flow.

## Repository development

From this directory, use `pnpm build`, `pnpm typecheck`, `pnpm lint`, and `pnpm test`. App projects
should follow the root Quickstart rather than this repository's contributor commands.
