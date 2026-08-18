# Config OAuth Client Credentials Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add an optional Config Extension declaration that maps OAuth client ID and client secret to persisted Config field keys.

**Architecture:** Extend the protobuf source of truth with a nested `ConfigOAuthClientCredentials` message and expose it through the existing TypeScript and Go Config APIs. Keep schema parsing additive and defer stored-value lookup and cross-field validation to the platform.

**Tech Stack:** Protocol Buffers, ts-proto, Zod, TypeScript, Go, Vitest, Changesets

**Spec:** `docs/superpowers/specs/2026-08-18-config-oauth-client-credentials-design.md`

## Global Constraints

- `oauth.clientCredentials` remains optional so existing Config schemas keep their current behavior.
- `clientIdFieldKey` and `clientSecretFieldKey` are required strings when the nested declaration is present.
- The SDK does not inspect Config blocks or validate storage classes for the referenced fields.
- Generated TypeScript, Zod, and Go files are updated only through `make proto-generate`.
- The public TypeScript change receives a minor changeset for `@channel.io/app-sdk-core`.
- No unrelated refactoring or validation behavior is added.

---

### Task 1: Add the Proto-backed public contract

**Files:**
- Modify: `ts/packages/core/src/__tests__/schemas/config.test.ts`
- Modify: `proto/channel/app/sdk/v1/extension.proto`
- Regenerate: `go/internal/gen/channel/app/sdk/v1/extension.pb.go`
- Regenerate: `ts/packages/core/src/gen/channel/app/sdk/v1/extension.ts`
- Regenerate: `ts/packages/core/src/gen/channel/app/sdk/v1/extension.zod.ts`
- Modify: `ts/packages/core/src/extensions/config.ts`
- Modify: `ts/packages/core/src/extensions/index.ts`
- Modify: `ts/packages/core/src/extensions/proto-contracts.ts`
- Modify: `ts/packages/core/src/__tests__/extensions/proto-field-parity.test.ts`
- Modify: `go/extension/config/proto_types.go`
- Modify: `go/extension/config/extension.go`

**Interfaces:**
- Consumes: `ConfigGetConfigSchemaOutput.oauth` and the existing `ConfigOAuth` namespace.
- Produces: `ConfigOAuthClientCredentials`, `ConfigOAuthClientCredentialsSchema`, `OAuthClientCredentials`, and `ProtoOAuthClientCredentials` with `clientIdFieldKey` and `clientSecretFieldKey`.

- [ ] **Step 1: Write the failing Config schema behavior test**

Extend the existing layout-aware Config test input with:

```typescript
oauth: {
  additionalParams: [{ name: "domain", fieldKey: "commerceDomain" }],
  clientCredentials: {
    clientIdFieldKey: "oauthClientId",
    clientSecretFieldKey: "oauthClientSecret",
  },
},
```

Assert the consumer-visible parsed value with a literal:

```typescript
expect(parsed.oauth?.clientCredentials).toEqual({
  clientIdFieldKey: "oauthClientId",
  clientSecretFieldKey: "oauthClientSecret",
});
```

This test catches removal or stripping of the new nested declaration during Config schema parsing.

- [ ] **Step 2: Run the test and verify the expected RED state**

Run:

```bash
cd ts
pnpm vitest run packages/core/src/__tests__/schemas/config.test.ts
```

Expected: FAIL because `GetConfigSchemaOutputSchema` strips `clientCredentials`, leaving the parsed value `undefined`.

- [ ] **Step 3: Add the protobuf contract and regenerate artifacts**

Add the new message and field without changing existing field numbers:

```proto
message ConfigOAuthClientCredentials {
  string client_id_field_key = 1;
  string client_secret_field_key = 2;
}

message ConfigOAuth {
  repeated ConfigOAuthAdditionalParam additional_params = 1;
  ConfigOAuthClientCredentials client_credentials = 2;
}
```

Run:

```bash
make proto-generate
```

Do not edit generated artifacts by hand.

- [ ] **Step 4: Expose the handwritten TypeScript schema and type**

Import the generated `ConfigOAuthClientCredentials` type in `config.ts`, then add:

```typescript
export const ConfigOAuthClientCredentialsSchema = z.object({
  clientIdFieldKey: z.string(),
  clientSecretFieldKey: z.string(),
});
export type ConfigOAuthClientCredentials = ProtoBacked<
  z.infer<typeof ConfigOAuthClientCredentialsSchema>,
  ProtoConfigOAuthClientCredentials
>;

export const ConfigOAuthSchema = z.object({
  additionalParams: z.array(ConfigOAuthAdditionalParamSchema).optional(),
  clientCredentials: ConfigOAuthClientCredentialsSchema.optional(),
});
```

Export both schema and type from `ts/packages/core/src/extensions/index.ts`.

- [ ] **Step 5: Keep Proto parity checks complete**

Import the generated type in `proto-contracts.ts` and add:

```typescript
Expect<
  SchemaOutputExtendsProto<
    typeof ConfigSchemas.ConfigOAuthClientCredentialsSchema,
    ProtoConfigOAuthClientCredentials
  >
>,
```

Import the schema in `proto-field-parity.test.ts` and register:

```typescript
contract(
  "ConfigOAuthClientCredentials",
  ConfigOAuthClientCredentialsSchema,
  "extension",
  "ConfigOAuthClientCredentials"
),
```

This protects field-name parity between the Proto descriptor and public Zod schema.

- [ ] **Step 6: Expose the Go aliases**

Add the public alias to `go/extension/config/extension.go`:

```go
type OAuthClientCredentials = sdkv1.ConfigOAuthClientCredentials
```

Add the internal parity alias to `go/extension/config/proto_types.go`:

```go
type ProtoOAuthClientCredentials = sdkv1.ConfigOAuthClientCredentials
```

- [ ] **Step 7: Verify GREEN for the focused contract**

Run:

```bash
cd ts
pnpm vitest run packages/core/src/__tests__/schemas/config.test.ts packages/core/src/__tests__/extensions/proto-field-parity.test.ts
cd ..
make proto-check
make proto-ssot-check
cd go
go test ./extension/config
```

Expected: both TypeScript test files pass, generated files are current, Proto SSOT passes, and the Go Config package passes.

- [ ] **Step 8: Commit the public contract**

```bash
git add proto/channel/app/sdk/v1/extension.proto \
  go/internal/gen/channel/app/sdk/v1/extension.pb.go \
  go/extension/config/proto_types.go \
  go/extension/config/extension.go \
  ts/packages/core/src/gen/channel/app/sdk/v1/extension.ts \
  ts/packages/core/src/gen/channel/app/sdk/v1/extension.zod.ts \
  ts/packages/core/src/extensions/config.ts \
  ts/packages/core/src/extensions/index.ts \
  ts/packages/core/src/extensions/proto-contracts.ts \
  ts/packages/core/src/__tests__/schemas/config.test.ts \
  ts/packages/core/src/__tests__/extensions/proto-field-parity.test.ts
git commit -m "feat(core): add Config OAuth client credential fields"
```

### Task 2: Document and release the additive API

**Files:**
- Modify: `ts/packages/core/src/extensions/interfaces/config.ts`
- Modify: `docs/reference/typescript/extensions/config.md`
- Create: `ts/.changeset/config-oauth-client-credentials.md`

**Interfaces:**
- Consumes: `oauth.clientCredentials` from Task 1.
- Produces: public TypeScript usage guidance and a minor release declaration.

- [ ] **Step 1: Document the declaration at the interface boundary**

Update the Config Extension JSDoc to explain that `oauth.clientCredentials` references persisted Config field keys. Extend its example with:

```typescript
clientCredentials: {
  clientIdFieldKey: "clientId",
  clientSecretFieldKey: "clientSecret",
},
```

Keep the existing `additionalParams` example to show that the two declarations can coexist.

- [ ] **Step 2: Add reference documentation**

Add an `OAuth Client Credentials` section to the TypeScript Config reference containing the same declaration and these rules:

- the values are Config field keys, not literal credentials
- omitting the declaration keeps app-level OAuth client credentials
- both referenced values must be available before the platform can start or refresh OAuth
- sensitive secrets should use `storageClass: "credential"` and `sensitive: true`

- [ ] **Step 3: Add the minor changeset**

Create `ts/.changeset/config-oauth-client-credentials.md`:

```markdown
---
"@channel.io/app-sdk-core": minor
---

Add Config Extension field references for Config-backed OAuth client credentials.
```

- [ ] **Step 4: Verify docs and formatting**

Run:

```bash
cd ts
pnpm prettier --check packages/core/src/extensions/interfaces/config.ts \
  ../docs/reference/typescript/extensions/config.md \
  .changeset/config-oauth-client-credentials.md
cd ..
git diff --check
```

Expected: Prettier and whitespace checks pass.

- [ ] **Step 5: Commit documentation and release metadata**

```bash
git add ts/packages/core/src/extensions/interfaces/config.ts \
  docs/reference/typescript/extensions/config.md \
  ts/.changeset/config-oauth-client-credentials.md
git commit -m "docs: document Config OAuth client credentials"
```

### Task 3: Verify the complete SDK change

**Files:**
- Review only: all files changed from `origin/main`

**Interfaces:**
- Consumes: the completed Proto, TypeScript, Go, documentation, and changeset changes.
- Produces: a verified branch ready for publication.

- [ ] **Step 1: Audit scope and generated artifacts**

Run:

```bash
git status --short
git diff --check origin/main...HEAD
git diff --stat origin/main...HEAD
make proto-check
```

Confirm that generated changes are limited to the new protobuf message and nested field, and that no credential values appear in the diff.

- [ ] **Step 2: Run the full repository verification**

Run:

```bash
make verify
```

Expected: lint, formatting, Proto checks, TypeScript/Go builds, 523 existing TypeScript tests plus the added contract assertions, CLI smoke test, and all Go tests pass.

- [ ] **Step 3: Review compatibility mutations**

Confirm from the actual schema and tests:

- removing `clientCredentials` from an app schema still parses successfully
- `additionalParams` continues to parse unchanged
- changing either new field name in the handwritten schema would fail Proto field-parity coverage
- removing the nested property from `ConfigOAuthSchema` would fail the Config behavior test

- [ ] **Step 4: Inspect the final commit range**

Run:

```bash
git log --oneline origin/main..HEAD
git status -sb
```

Expected: the design commit, public contract commit, and documentation/changeset commit are present, with a clean working tree.
