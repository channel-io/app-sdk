# Store Extension

Use Store to provide localized App Store identity and presentation metadata. It does not implement
provider commerce operations and must not contain credentials.

## Contract

`extension.store.metadata.getStoreProfile` is required. Register `store:v1`; AppStore reads and
persists the profile during registration or synchronization rather than calling it for every list
or detail view.

Return `relatedAppIds`, optional `root` content, and an `i18nMap` keyed by any non-empty Desk locale code. Root is not a locale. Add only locales
that contain authored content; `ko`, `ja`, and `en` are not pre-created or required. Each locale
contains media-key images with optional alt text, an intro (`helpsWith`, `recommendedFor`), and
FAQs. Return the persisted metadata directly without a `profile` wrapper.

AppStore treats images, intro fields, and related apps as extension-first fallbacks: a non-empty
extension value is shown read-only in the Developer GUI. FAQs are additive instead. Extension FAQs
are shown first and remain read-only, while Developer GUI FAQs can be appended and edited.
For each field, locale fallback is `ko → root → en` for Korean, `en → root` for English, and
`locale → en → root` for every other locale.

## TypeScript

Use `@Extension({ name: "store", systemVersion: "v1" })` with
`GetStoreProfileInputSchema` and `GetStoreProfileOutputSchema`. Return the profile directly, not
inside a `profile` wrapper. See the [TypeScript Store reference](../../../reference/typescript/extensions/store.md).

## Go

```go
err := app.Use(store.Extension().GetStoreProfile(handler.GetStoreProfile))
```

Use the `extension/store` DTOs and keep stable IDs separate from localized labels.

## Authentication and reliability

- Registration uses an app token; profile reads do not need provider credentials.
- Sanitize externally sourced text and URLs before returning them.
- Increment or re-register when presentation metadata changes according to the release process.
- Test every locale you author, arbitrary locale codes, missing optional assets, invalid URLs, schema discovery, and a real
  registration/sync readback.

See the [Go Extension reference](../../../reference/go/EXTENSIONS.md).
