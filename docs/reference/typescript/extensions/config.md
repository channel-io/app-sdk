# Config Extension

Use the config extension when your app needs a layout-aware setup surface that can store plain configuration values, sensitive credentials, or both.

This is the canonical setup contract for:

- grouped fields and sectioned layouts
- helper copy and descriptions
- dropdowns, multiselects, radios, checkboxes, switches, phone/address fields, and image inputs
- hook-aware setup flows where the schema can reference ordinary app functions

## Required Functions

- `extension.config.metadata.getConfigSchema`

## Optional Functions

- `extension.config.validation.validateStoredConfig`

## Registration

The canonical registration path is:

- `registerExtension("config", "v1")`

## Runtime Expectations

- AppStore resolves stored config into `ctx.config`
- config setup WAMs should use public native functions for reading, saving, validating, and deleting scoped config values
- schema `hooks` may reference ordinary app functions such as `draftResolverFunctionName` and `validateFunctionName`
- these hook targets are ordinary app functions, not additional config extension functions

## Multi Config

Set `supportsMultiple: true` when one scope can store multiple independent config items. Each item has a stable outer `key`. Ordinary app functions receive `{ [key]: values }` in `ctx.config`, even when only one item exists. Stored-config validation receives the selected item's flat `values` object in `ctx.config`.

`keyResolverFunctionName` is optional. If it is omitted and a new item has no requested key, AppStore assigns a key. Apps that already own a stable identifier may pass that identifier to the keyed config native functions without declaring a resolver.

## Implementation Notes

- use `storageClass: "credential"` for encrypted or masked fields
- use `storageClass: "transient"` for draft-only values, such as images that a hook processes and clears before save
- use `storageClass: "media"` for image fields that should upload to the media server and persist only a media reference
- use `resolvesTo` when a transient input should produce a different stored config or credential key
- use `group` blocks to keep related inputs together
- use `i18nMap` for locale-specific display text while keeping fallback text such as `label`, `title`, and `description`
- `validateStoredConfig` should validate the already stored values, not raw request payloads
- use `hooks.draftResolverFunctionName` when field changes should derive additional draft values
  - AppStore standard WAM calls the referenced function with `{ scope, channelId, managerId?, changedFieldKey, changedValue, values }`
- use `hooks.validateFunctionName` when validation needs richer logic than declarative schema rules
  - AppStore backend calls the referenced function during stored config validation and passes the canonical values through `ctx.config`
- `validation.validateStoredConfig` remains the default fallback when `hooks.validateFunctionName` is omitted
- validation output may include `notices`
  - use `placement: "top"` for page-level banners
  - use `placement: "block"` with `blockId` to place a banner near a specific section/group/banner block
- assign stable `id` values to blocks when function-driven validation needs to target a specific place in the layout

## Image Storage

Image fields default to transient behavior unless `storageClass: "media"` is explicitly set. Media image fields are uploaded by AppStore's standard WAM, and function calls receive the parsed reference through `ctx.config`.

```json
{
  "brandLogo": {
    "type": "media",
    "key": "pub-file/...",
    "bucket": "channel-io-media",
    "url": "https://cf.channel.io/pub-file/...",
    "name": "logo.png",
    "contentType": "image/png",
    "size": 12345
  }
}
```

For image inputs that should not be stored but should produce a credential, combine `storageClass: "transient"` with `resolvesTo`.

```json
{
  "type": "image",
  "key": "otpQrImage",
  "label": "OTP QR image",
  "storageClass": "transient",
  "resolvesTo": {
    "key": "otpSecret",
    "storageClass": "credential",
    "sensitive": true,
    "maskType": "full"
  }
}
```

In this pattern, the draft resolver receives the image value, returns `valuesPatch.otpSecret`, and AppStore persists only `otpSecret`. The image remains draft-only.

## Internationalized Display Text

Config schemas can include optional `i18nMap` entries for user-facing text. The base fields remain the fallback and should always be usable on their own. Supported locale keys are `ko`, `ja`, and `en`.

```json
{
  "type": "select",
  "key": "storeType",
  "label": "Store type",
  "description": "Choose the store type.",
  "placeholder": "Select a store type",
  "helperText": "Use {guide} if you are unsure.",
  "helperLinks": [
    {
      "key": "guide",
      "label": "setup guide",
      "url": "https://example.com/en/guide",
      "i18nMap": {
        "ko": {
          "label": "설정 가이드",
          "url": "https://example.com/ko/guide"
        }
      }
    }
  ],
  "i18nMap": {
    "ko": {
      "label": "스토어 유형",
      "description": "스토어 유형을 선택하세요.",
      "placeholder": "스토어 유형 선택",
      "helperText": "잘 모르겠다면 {guide}를 확인하세요."
    },
    "ja": {
      "label": "ストア種別",
      "description": "ストア種別を選択してください。",
      "placeholder": "ストア種別を選択"
    },
    "en": {
      "label": "Store type"
    }
  },
  "choices": [
    {
      "label": "Online",
      "value": "online",
      "i18nMap": {
        "ko": {
          "label": "온라인"
        }
      }
    }
  ]
}
```

`i18nMap` is supported on the schema root, overview, settings, default selectors, blocks, fields, choices, helper links, validation errors, and validation notices. Use it only for text or locale-specific helper URLs. Stable identifiers such as `key`, `id`, `fieldKey`, `value`, `renderer`, and function names must not be localized.

Locale entries are partial. For example, `i18nMap.ko.label` can override only the label while the base `description` remains the fallback. Japanese uses the locale key `ja`.

Supported localized display keys include:

- schema: `providerName`, `title`, `description`
- overview: `title`, `description`, `nameLabel`, `addLabel`, `statusLabel`
- settings and default selectors: `title`, `description`, `label`, `placeholder`, `noneLabel`, `onChangeSuccessMessage`
- blocks and actions: `title`, `description`, `text`, `menuLabel`, `label`, `successMessage`
- fields: `label`, `description`, `helperText`, `placeholder`, `fieldLabels`, phone/address placeholders, `overviewLabel`, `overviewDescription`
- choices and links: `label`, `description`, `url`
- validation: `message`, `title`
