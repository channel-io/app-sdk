#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")/.."

locales=(en ko ja)
required_text=(
  'git clone https://github.com/channel-io/app-tutorial-ts.git'
  'git clone https://github.com/channel-io/app-tutorial.git'
  'corepack pnpm install --frozen-lockfile'
  'make test'
  'https://YOUR_HOST/functions'
  'https://YOUR_HOST/resource/wam'
  '/tutorial'
  'registerExtension(appId, extensionName, systemVersion)'
  'functions.md'
  'extensions/command.md'
  'wam.md'
  'app-development.md'
  'extensions.md'
  '../../reference/typescript/README.md'
  '../../reference/go/README.md'
)
assets=(
  app-store-entry.png
  create-app.png
  app-id.png
  app-secret.png
  permissions.png
  endpoints.png
  tutorial-wam.png
  tutorial-result.png
)

failed=0
for locale in "${locales[@]}"; do
  guide="docs/guides/${locale}/quickstart.md"
  if [[ ! -f "$guide" ]]; then
    printf 'Missing first-app guide: %s\n' "$guide" >&2
    failed=1
    continue
  fi

  for expected in "${required_text[@]}"; do
    if ! grep -Fq "$expected" "$guide"; then
      printf 'Missing required first-app step in %s: %s\n' "$guide" "$expected" >&2
      failed=1
    fi
  done

  if [[ "$(grep -Fc '../../assets/first-app/' "$guide")" -ne "${#assets[@]}" ]]; then
    printf 'Expected %d first-app images in %s\n' "${#assets[@]}" "$guide" >&2
    failed=1
  fi

  if grep -Eiq 'developers\.channel\.io|registerCommands|window\.ChannelIOWam|app-store-api\.channel\.io' "$guide"; then
    printf 'Found retired implementation guidance in %s\n' "$guide" >&2
    failed=1
  fi

  index="docs/guides/${locale}/README.md"
  if ! grep -Eq '^1\. .*\(quickstart\.md\)' "$index"; then
    printf 'Quickstart must be the first document in %s\n' "$index" >&2
    failed=1
  fi

  ordered_guides=(
    quickstart.md
    concepts.md
    functions.md
    extensions/command.md
    wam.md
    app-development.md
    extensions.md
  )
  for index_number in "${!ordered_guides[@]}"; do
    number=$((index_number + 1))
    target="${ordered_guides[$index_number]}"
    if ! grep -Eq "^${number}\\. .*\\(${target//\//\\/}\\)" "$index"; then
      printf 'Expected guide %d to point to %s in %s\n' "$number" "$target" "$index" >&2
      failed=1
    fi
  done

  for target in "${ordered_guides[@]}"; do
    path="docs/guides/${locale}/${target}"
    if [[ ! -s "$path" ]]; then
      printf 'Missing localized app guide: %s\n' "$path" >&2
      failed=1
    fi
  done

  for expected in issueToken refreshToken channelId x-access-token; do
    if ! grep -Fq "$expected" "docs/guides/${locale}/concepts.md"; then
      printf 'Missing preserved token guidance in %s: %s\n' "docs/guides/${locale}/concepts.md" "$expected" >&2
      failed=1
    fi
  done

  for expected in x-signature callAppFunction CallAppFunction camelCase; do
    if ! grep -Fq "$expected" "docs/guides/${locale}/functions.md"; then
      printf 'Missing preserved Function guidance in %s: %s\n' "docs/guides/${locale}/functions.md" "$expected" >&2
      failed=1
    fi
  done

  for expected in actionFunctionName autoCompleteFunctionName focused choices alfMode enabledByDefault; do
    if ! grep -Fq "$expected" "docs/guides/${locale}/extensions/command.md"; then
      printf 'Missing preserved Command guidance in %s: %s\n' "docs/guides/${locale}/extensions/command.md" "$expected" >&2
      failed=1
    fi
  done

  for expected in WamProvider useCallFunction useNativeFunction useWamSize useWamClose; do
    if ! grep -Fq "$expected" "docs/guides/${locale}/wam.md"; then
      printf 'Missing preserved WAM guidance in %s: %s\n' "docs/guides/${locale}/wam.md" "$expected" >&2
      failed=1
    fi
  done
done

root_required_text=(
  '> **Building your first Channel app?**'
  '[Korean](docs/guides/ko/quickstart.md)'
  '[English](docs/guides/en/quickstart.md)'
  '[Japanese](docs/guides/ja/quickstart.md)'
)

for expected in "${root_required_text[@]}"; do
  if ! grep -Fq "$expected" README.md; then
    printf 'Root README is missing first-app callout content: %s\n' "$expected" >&2
    failed=1
  fi
done

if ! grep -Fq '## Recommended Documentation Order' README.md; then
  printf 'Root README must publish the documentation reading order\n' >&2
  failed=1
fi

for asset in "${assets[@]}"; do
  path="docs/assets/first-app/${asset}"
  if [[ ! -s "$path" ]]; then
    printf 'Missing first-app image: %s\n' "$path" >&2
    failed=1
  fi
done

if grep -Riq 'developers\.channel\.io/.*/articles' docs/guides; then
  printf 'Localized SDK guides must not depend on retired developer articles\n' >&2
  failed=1
fi

if grep -REiq 'registerCommands|window\.ChannelIOWam|callCommand|notion\.so|App Studio|cht-app' docs/guides; then
  printf 'Localized SDK guides contain retired or non-public implementation guidance\n' >&2
  failed=1
fi

exit "$failed"
