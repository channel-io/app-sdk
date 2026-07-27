#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")/.."

locales=(en ko ja)
recipes=(
  config
  oauth
  command
  widget
  customtab
  hook
  polling
  calendar
  store
  datasource
  commerce
  wms
  messaging
  alf-task
  notebook
  mail-relay
)
excluded_recipes=(apikey order)

failed=0
for locale in "${locales[@]}"; do
  overview="docs/guides/${locale}/extensions.md"
  for recipe in "${recipes[@]}"; do
    guide="docs/guides/${locale}/extensions/${recipe}.md"
    if [[ ! -f "$guide" ]]; then
      printf 'Missing %s Extension recipe: %s\n' "$locale" "$guide" >&2
      failed=1
      continue
    fi

    if ! grep -q '^## TypeScript' "$guide"; then
      printf 'Missing TypeScript section: %s\n' "$guide" >&2
      failed=1
    fi
    if ! grep -q '^## Go' "$guide"; then
      printf 'Missing Go section: %s\n' "$guide" >&2
      failed=1
    fi
    if ! grep -Eiq 'test|verification|검증|테스트|検証' "$guide"; then
      printf 'Missing verification guidance: %s\n' "$guide" >&2
      failed=1
    fi
    if ! grep -Fq "](extensions/${recipe}.md)" "$overview"; then
      printf 'Missing overview link for %s: %s\n' "$recipe" "$overview" >&2
      failed=1
    fi
  done

  for recipe in "${excluded_recipes[@]}"; do
    guide="docs/guides/${locale}/extensions/${recipe}.md"
    if [[ -e "$guide" ]]; then
      printf 'Unexpected retired Extension recipe: %s\n' "$guide" >&2
      failed=1
    fi
  done
done

exit "$failed"
