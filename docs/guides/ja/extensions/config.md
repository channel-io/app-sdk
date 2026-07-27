# Config Extension

Channel/manager 単位の設定、API key、`client_credentials`、shop ID、credential には Config を
使います。Config は新規アプリの標準 setup surface です。

## Contract

| Function                                           | 必須 | 役割                              |
| -------------------------------------------------- | ---- | --------------------------------- |
| `extension.config.metadata.getConfigSchema`        | 必須 | Field、layout、scope、hook を宣言 |
| `extension.config.validation.validateStoredConfig` | 任意 | 保存済み canonical value を検証   |

`config:v1` を登録します。AppStore は値を保存して `ctx.config` に注入します。Secret field には
`storageClass: "credential"` を使います。安定した key は翻訳せず、表示文言だけを `ko`、`ja`、
`en` の `i18nMap` で翻訳します。

## Schema model

- `schemaVersion: "v1"`、`configScope: "channel" | "manager"`、provider name、`blocks` を返します。
- 通常値は `storageClass: "config"`、暗号化/mask 値は `credential`、draft-only input は
  `transient`、保存する media reference は `media` を使います。
- 複数の独立 item を保存する場合は `supportsMultiple: true` を使います。通常 Function の
  `ctx.config` は key-to-values map、validation には選択 item の flat values が渡されます。
- `hooks.draftResolverFunctionName` は draft patch、`hooks.validateFunctionName` は高度な validation
  を行います。どちらも standalone app Function を参照します。
- Transient image は `resolvesTo` で credential を生成できます。Media image は binary ではなく
  reference を保存します。
- `i18nMap` は表示文言と locale 別 help URL だけに使います。`key`、`id`、`fieldKey`、choice value、
  renderer、Function name は翻訳しません。

## TypeScript

`@Extension({ name: "config", systemVersion: "v1" })`、`ConfigFunctionNames`、
`GetConfigSchemaOutputSchema`、`ValidateStoredConfigOutputSchema` を使います。Class を NestJS
provider に追加すると `ChannelAppModule` が検出して auto-register します。Schema、multi-config、
image、hook、localization の詳細は [TypeScript Config reference](../../../reference/typescript/extensions/config.md)
を参照してください。

## Go

```go
err := app.Use(config.Extension().
  GetConfigSchema(handler.GetConfigSchema).
  ValidateStoredConfig(handler.ValidateStoredConfig))
```

`extension/config` の公開 request/response type を使います。`server.WithAutoRegister()` が cached
app token で宣言済み Extension を登録します。

## 認証・WAM・検証

- Credential を WAM response や `wamArgs` に渡しません。
- 設定 WAM は公開 Config native operation を使い、provider call は server Function が行います。
- Schema hook target は standalone app Function であり、新しい Config Function ではありません。
- Schema discovery、必須 field 不足、保存値検証、secret masking、3 locale を test します。

[Go Extension reference](../../../reference/go/EXTENSIONS.md) も参照してください。
