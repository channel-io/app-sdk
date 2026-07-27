# Config Extension

Use Config for channel- or manager-scoped settings, API keys, `client_credentials`, shop IDs, and
other credentials. It is the standard setup surface for new apps.

## Contract

| Function                                           | Requirement | Purpose                                   |
| -------------------------------------------------- | ----------- | ----------------------------------------- |
| `extension.config.metadata.getConfigSchema`        | Required    | Declares fields, layout, scope, and hooks |
| `extension.config.validation.validateStoredConfig` | Optional    | Validates the canonical stored values     |

Register `config:v1`. AppStore stores values and injects them into `ctx.config`; credential fields
must use `storageClass: "credential"`. Stable keys are never localized, while display text may use
`i18nMap` for `ko`, `ja`, and `en`.

## Schema model

- Return `schemaVersion: "v1"`, `configScope: "channel" | "manager"`, a provider name, and `blocks`.
- Use `storageClass: "config"` for ordinary values, `credential` for encrypted/masked values,
  `transient` for draft-only inputs, and `media` for a persisted media reference.
- Set `supportsMultiple: true` for multiple independent items. Ordinary Functions then receive a
  key-to-values map in `ctx.config`; validation receives the selected item's flat values.
- `hooks.draftResolverFunctionName` derives draft patches; `hooks.validateFunctionName` performs
  richer validation. Both names point to standalone app Functions.
- A transient image may use `resolvesTo` to produce a credential. A media image persists a reference,
  not binary image data.
- Use `i18nMap` only for display text and locale-specific help URLs. Never translate `key`, `id`,
  `fieldKey`, choice values, renderer names, or Function names.

## TypeScript

Use `@Extension({ name: "config", systemVersion: "v1" })`,
`ConfigFunctionNames`, `GetConfigSchemaOutputSchema`, and
`ValidateStoredConfigOutputSchema`. Add the class to the NestJS providers so `ChannelAppModule`
discovers and auto-registers it. The complete schema, multi-config, image, hook, and localization
examples are in the [TypeScript Config reference](../../../reference/typescript/extensions/config.md).

## Go

```go
err := app.Use(config.Extension().
  GetConfigSchema(handler.GetConfigSchema).
  ValidateStoredConfig(handler.ValidateStoredConfig))
```

Use exported `extension/config` request and response types. `server.WithAutoRegister()` registers
the declared Extension with a cached app token.

## Authentication, WAM, and reliability

- Keep credentials in Config; never return them to a WAM or copy them into `wamArgs`.
- Setup WAMs use public native Config operations; provider calls remain server Functions.
- Hook targets referenced by the schema are standalone app Functions, not new Config Functions.
- Test schema discovery, missing required fields, stored-value validation, secret masking, and each
  supported locale.

See the [Go Extension reference](../../../reference/go/EXTENSIONS.md).
