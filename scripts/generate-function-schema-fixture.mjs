#!/usr/bin/env node

import { existsSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const coreDist = join(repoRoot, "ts/packages/core/dist");
const entrypoint = join(coreDist, "extensions/function-schemas.js");
const fixturePath = join(repoRoot, "go/extension/schemaregistry/extension_function_schemas.json");

if (!existsSync(entrypoint)) {
  console.error(
    `Missing ${entrypoint}.\n` +
      `Build the core package first: pnpm --dir ts --filter @channel.io/app-sdk-core build\n` +
      `If dist was deleted by hand, also remove ts/packages/core/tsconfig.tsbuildinfo ` +
      `so the composite build re-emits.`
  );
  process.exit(1);
}

const { getExtensionFunctionSchemas } = await import(pathToFileURL(entrypoint).href);

writeFileSync(fixturePath, `${JSON.stringify(getExtensionFunctionSchemas(), null, 2)}\n`);
console.log(`Wrote ${fixturePath}`);
