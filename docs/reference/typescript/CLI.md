# TypeScript CLI

`@channel.io/app-sdk` includes a small project scaffolder. It is similar in purpose to an app
starter generator: it writes a working baseline, while the SDK references remain the API contract.

## Create

```sh
npx @channel.io/app-sdk create my-app
cd my-app
corepack pnpm install
cp apps/server/.env.example apps/server/.env
corepack pnpm build
corepack pnpm typecheck
```

The generated workspace contains:

```text
apps/server/      NestJS SDK server, signature guard, auto-registration
apps/wam/         React WAM using WAM SDK, WAM UI, and Bezier
packages/shared/  Zod contracts shared by server and WAM
```

The generator uses the installed CLI's SDK version and pins the currently verified WAM UI and
Bezier baseline. It requires App ID, App Secret, and Signing Key, enables raw-body capture for HMAC
verification, and keeps credentials out of the WAM.

There is one maintained starter. The CLI does not accept a template option.

## Other commands

`add`, `dev`, `build`, and `generate` remain convenience commands for existing CLI workflows. Before
using generated Extension snippets, compare them with the selected
[Extension family reference](./extensions/README.md). For a first app, prefer `create` plus the
[Quickstart](../../guides/en/quickstart.md).

## Complete example

The generated starter deliberately stays small. Use the
[TypeScript tutorial](https://github.com/channel-io/app-tutorial-ts) for a complete command → WAM →
server/native-call flow and the [TypeScript reference map](./README.md) for exact package APIs.
