# Store Extension

App Store identity와 presentation metadata를 다국어로 제공할 때 사용합니다. Provider commerce
operation을 구현하는 Extension이 아니며 credential을 포함하면 안 됩니다.

## 계약

`extension.store.metadata.getStoreProfile`이 필수입니다. `store:v1`을 등록하면 AppStore가 등록 또는
sync 시 profile을 읽어 저장하며, list/detail 요청마다 app Function을 호출하지 않습니다.

`relatedAppIds`와 `ko`, `ja`, `en`을 모두 포함하는 strict `i18nMap`을 반환합니다. 각 locale은 media
key image와 optional alt text, intro(`helpsWith`, `recommendedFor`), FAQ를 포함합니다. `profile`
wrapper 없이 persisted metadata를 직접 반환합니다.

## TypeScript

`@Extension({ name: "store", systemVersion: "v1" })`, `GetStoreProfileInputSchema`,
`GetStoreProfileOutputSchema`를 사용합니다. `profile` wrapper 없이 profile을 직접 반환합니다.
[TypeScript Store 레퍼런스](../../../reference/typescript/extensions/store.md)를 확인하세요.

## Go

```go
err := app.Use(store.Extension().GetStoreProfile(handler.GetStoreProfile))
```

`extension/store` DTO를 사용하고 stable ID와 localized label을 분리합니다.

## 인증·검증

- 등록은 app token을 사용하며 profile 조회에는 provider credential이 필요하지 않습니다.
- 외부에서 가져온 문구와 URL을 반환하기 전에 sanitize합니다.
- Release 절차에 따라 metadata 변경 시 version 또는 re-registration을 처리합니다.
- 세 locale, optional asset 누락, invalid URL, schema discovery, 실제 registration/sync readback을
  테스트합니다.

[Go Extension 레퍼런스](../../../reference/go/EXTENSIONS.md)도 확인하세요.
