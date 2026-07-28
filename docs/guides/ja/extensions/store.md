# Store Extension

App Store identity と presentation metadata を多言語で提供するときに使います。Provider commerce
operation を実装する Extension ではなく、credential を含めてはいけません。

## Contract

`extension.store.metadata.getStoreProfile` が必須です。`store:v1` を登録すると AppStore は
registration/sync 時に profile を読み、list/detail request ごとには app Function を呼びません。

`relatedAppIds`、optional `root` content、Desk の non-empty locale code を key にする `i18nMap` を返します。root は locale ではありません。実際に
作成した locale だけを追加し、`ko`、`ja`、`en` を事前に作成したり、すべて埋めたりする必要は
ありません。各 locale は media key image と optional alt text、intro（`helpsWith`、
`recommendedFor`）、FAQ を含みます。`profile` wrapper なしで persisted metadata を直接返します。

AppStore は image、intro field、related app を extension-first fallback として扱います。
extension value が空でなければ Developer GUI では read-only です。FAQ は例外として加算され、
extension FAQ を先に read-only で表示した後、Developer GUI FAQ を追加・編集できます。
Field ごとの locale fallback は、韓国語では `ko → root → en`、英語では `en → root`、その他の
locale では `locale → en → root` の順です。

## TypeScript

`@Extension({ name: "store", systemVersion: "v1" })`、`GetStoreProfileInputSchema`、
`GetStoreProfileOutputSchema` を使います。`profile` wrapper ではなく profile を直接返します。
[TypeScript Store reference](../../../reference/typescript/extensions/store.md) を参照してください。

## Go

```go
err := app.Use(store.Extension().GetStoreProfile(handler.GetStoreProfile))
```

`extension/store` DTO を使い、stable ID と localized label を分離します。

## 認証・検証

- Registration は app token を使い、profile read に provider credential は不要です。
- 外部由来の文言と URL は返す前に sanitize します。
- Release 手順に従って metadata 変更時の version または re-registration を処理します。
- 作成したすべての locale、任意の locale code、optional asset 不足、invalid URL、schema discovery、実際の registration/sync readback
  を test します。

[Go Extension reference](../../../reference/go/EXTENSIONS.md) も参照してください。
