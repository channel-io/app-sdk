#!/usr/bin/env bash
set -euo pipefail

root_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
temporary_dir="$(mktemp -d)"
trap 'rm -rf "$temporary_dir"' EXIT

packs_dir="$temporary_dir/packs"
mkdir -p "$packs_dir"

for package_dir in core server wam wam-ui; do
  corepack pnpm \
    --dir "$root_dir/ts/packages/$package_dir" \
    pack \
    --pack-destination "$packs_dir" >/dev/null
done

cd "$temporary_dir"
node "$root_dir/ts/packages/cli/dist/cli.js" create smoke-app
cd smoke-app

ROOT_DIR="$root_dir" PACKS_DIR="$packs_dir" node <<'NODE'
const { readFileSync, writeFileSync } = require("node:fs");
const { join } = require("node:path");

const packageDirectories = ["core", "server", "wam", "wam-ui"];
const overrides = Object.fromEntries(
  packageDirectories.map((packageDirectory) => {
    const manifest = JSON.parse(
      readFileSync(join(process.env.ROOT_DIR, "ts/packages", packageDirectory, "package.json"), "utf8")
    );
    const archiveName = `${manifest.name.replace(/^@/, "").replaceAll("/", "-")}-${manifest.version}.tgz`;
    return [manifest.name, `file:${join(process.env.PACKS_DIR, archiveName)}`];
  })
);

const rootPackagePath = join(process.cwd(), "package.json");
const rootPackage = JSON.parse(readFileSync(rootPackagePath, "utf8"));
rootPackage.pnpm = {
  ...(rootPackage.pnpm ?? {}),
  overrides: {
    ...(rootPackage.pnpm?.overrides ?? {}),
    ...overrides,
  },
};
writeFileSync(rootPackagePath, `${JSON.stringify(rootPackage, null, 2)}\n`);
NODE

corepack pnpm install --ignore-scripts --reporter=silent
corepack pnpm build
corepack pnpm typecheck
