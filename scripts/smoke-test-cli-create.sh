#!/usr/bin/env bash
set -euo pipefail

root_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
temporary_dir="$(mktemp -d)"
trap 'rm -rf "$temporary_dir"' EXIT

packs_dir="$temporary_dir/packs"
mkdir -p "$packs_dir"

for package_dir in core server wam wam-ui; do
  pnpm \
    --dir "$root_dir/ts/packages/$package_dir" \
    pack \
    --pack-destination "$packs_dir" >/dev/null
done

cd "$temporary_dir"
node "$root_dir/ts/packages/cli/dist/cli.js" create smoke-app
cd smoke-app

ROOT_DIR="$root_dir" PACKS_DIR="$packs_dir" node <<'NODE'
const { appendFileSync, readFileSync } = require("node:fs");
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

// pnpm 11 reads overrides only from pnpm-workspace.yaml; it ignores the "pnpm" field in package.json.
const overrideLines = Object.entries(overrides).map(([name, spec]) => `  "${name}": "${spec}"`);
appendFileSync(join(process.cwd(), "pnpm-workspace.yaml"), `\noverrides:\n${overrideLines.join("\n")}\n`);
NODE

# Run the starter with the pnpm version it pins in packageManager, not whatever pnpm is on PATH.
# turbo spawns `pnpm` from PATH for each package; a different PATH pnpm then runs under corepack's
# environment and refuses to switch versions.
corepack_bin_dir="$temporary_dir/corepack-bin"
mkdir -p "$corepack_bin_dir"
corepack enable --install-directory "$corepack_bin_dir" pnpm
export PATH="$corepack_bin_dir:$PATH"

# Install scripts run, so the starter's allowBuilds list is checked: strictDepBuilds fails on any other one.
corepack pnpm install --reporter=silent
corepack pnpm build
corepack pnpm typecheck
