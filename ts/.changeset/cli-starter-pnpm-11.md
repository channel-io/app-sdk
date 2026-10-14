---
"@channel.io/app-sdk": patch
---

`create` now generates a starter that pins pnpm 11.24.0 and requires Node.js 22.13 or newer. Its `pnpm-workspace.yaml` lists the dependencies allowed to run install scripts (`esbuild`, `protobufjs`) and sets `strictDepBuilds: true`, so pnpm stops the install when any other dependency asks to run one.
