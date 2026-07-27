---
name: build-channel-app
description: Build, review, or troubleshoot Channel App Store server and WAM projects with the official TypeScript or Go SDK. Use for new apps, command/widget/custom-tab WAM flows, extension registration, function handlers, tokens and permissions, endpoint setup, and pre-release verification.
---

# Build Channel App

Use the official SDK as the implementation source of truth. Read
[references/current-sdk.md](references/current-sdk.md) before choosing packages, routes, or
registration APIs.

## Workflow

1. Identify the target language, existing web framework, extension families, WAM surfaces, required native operations, and the actor for each operation (`app`, `channel`, `manager`, or `user`).
2. Inspect package manifests and lockfiles. Resolve the latest published versions from npm or Go tags instead of trusting a copied version string.
3. For a new app, start with the matching end-to-end guide:
   - English: [../../docs/guides/en/quickstart.md](../../docs/guides/en/quickstart.md)
   - Korean: [../../docs/guides/ko/quickstart.md](../../docs/guides/ko/quickstart.md)
   - Japanese: [../../docs/guides/ja/quickstart.md](../../docs/guides/ja/quickstart.md)
     For architecture or an existing app, read that locale's `app-development.md`.
     Read that locale's `concepts.md` when the task introduces or changes Functions, Extensions, WAM, authentication, tokens, or endpoints.
     Read that locale's `extensions.md` before selecting an Extension family. Then use
     [references/extension-recipes.md](references/extension-recipes.md) to open that locale's
     family recipe and the matching TypeScript or Go reference.
     For Go implementations, also read [../../docs/reference/go/README.md](../../docs/reference/go/README.md) and the task-specific Go reference it links.
4. If no app exists yet, guide the user through a development private app, server-side credential storage, minimum permissions, stable HTTPS endpoint roots, startup/auto-registration, and test-channel installation in that order. Do not guess portal labels that cannot be verified.
5. Define the user outcome, execution surface, minimum permissions, standard Extension, and standard Function names before writing code. Separate official Extension Functions from standalone app Functions; do not invent an Extension as a namespace.
6. Inspect public exports and extension schemas. Prefer official provider API documentation; if
   browser automation is unavoidable, use a reproducible observed workflow and never guess URLs
   or schemas. When private reference implementations are available, use them only to identify
   patterns and read [references/publication-safety.md](references/publication-safety.md) before
   producing any public artifact.
7. Classify authentication before generating handlers. Separate inbound `x-signature`, server app/channel tokens, WAM manager/user authorization, provider OAuth tokens, and config-backed credentials. Authorization Code uses OAuth metadata and `ctx.authToken`; `client_credentials`, API keys, and per-shop secrets use config-backed credentials.
8. Implement the smallest end-to-end slice: extension metadata, typed action function, server route, optional WAM, required token/native call, and request verification.
9. Configure the Function Endpoint as the `/functions` root and the WAM Endpoint as the WAM root before relying on startup auto-registration. Let the SDK and AppStore add system versions and WAM names; restart after endpoint or permission changes when registration runs at startup.
10. When a hosting platform supplies `APP_STORE_URL` or registration settings, preserve them; the platform may own endpoint synchronization and post-deploy registration.
11. Verify clean installs, type checks, builds, tests, bad signatures, extension registration, WAM load, unsupported surfaces, loading/error UI, and permission failures.
12. Report protocol fallbacks explicitly when the selected language lacks an SDK wrapper. Keep each fallback isolated behind a small adapter.

## Guardrails

- Keep App Secret, Signing Key, access tokens, and refresh tokens on the server.
- Treat `ctx.authToken` as an external OAuth provider token, not an app/channel token.
- Use `TokenManager`; never issue a token for every request.
- Use Extension metadata and SDK auto-registration.
- Preserve raw request bytes for HMAC verification.
- Use WAM SDK hooks for host data, sizing, navigation, and native calls.
- Keep secrets and tokens out of WAM bundles, runtime data, and `wamArgs`. Use `useCallFunction` for app/bot work and `useNativeFunction` only for current manager/user work.
- Never combine a client-selected resource ID with a server app/channel token without server-side authorization. Bind privileged targets to trusted Function context or a short-lived signed capability and validate them again in the server Function.
- Allowlist the exact `wamArgs` keys sent to the browser. Handle unsupported chat/surface types explicitly, render safe error states, and disable duplicate submissions while a call is loading.
- Request only required Channel, Manager, and User permissions.
- Use a shared token cache for multiple server replicas.
- Prefer typed extension builders/schemas, then generic SDK registration, then a protocol adapter as the final option.
- Preserve generated decorators, schemas, providers, and registration structure; extend handler logic instead of replacing it with raw routing.
- Never copy code, identifiers, URLs, configuration keys, screenshots, or app-specific behavior
  from a private reference implementation into a public app, guide, example, fixture, or skill.
  Re-derive the pattern from public SDK exports and write a new synthetic example.
- Start with read-only verification. Enable mutations only with an official contract and a recoverable test environment.
- Never copy passwords, cookies, tokens, API keys, real tenant/domain values, or customer records into source, fixtures, logs, docs, or workflow evidence.
- Let the user complete login, OTP, CAPTCHA, and other human verification steps.

## Validation

For TypeScript, run the package manager's lockfile-respecting install, typecheck, test, and build commands for both server and WAM. For Go, run `gofmt`, `go mod tidy`, `go test ./...`, a binary build, and the WAM build when present.

For a new Extension implementation, finish the family recipe's TypeScript or Go path, authentication
and permission analysis, registration or secondary-sync step, WAM decision, retry/idempotency
behavior, and test checklist before declaring the app ready.
