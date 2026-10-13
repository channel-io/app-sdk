# Config Extension

채널·매니저 단위 설정, API key, `client_credentials`, shop ID와 credential은 Config로
관리합니다. Config는 신규 앱의 표준 설정 화면입니다.

## 표준 설정 탭 숨기기

앱스토어 지원 배포 후 앱이 자체 설정 UI를 제공하는 경우 `getConfigSchema`의
최상위에 `hideSettingsTab: true`를 선언합니다. 생략하거나 `false`이면 기존 탭을
유지합니다. 값을 변경한 뒤 Config extension을 재등록해야 반영됩니다.
저장값, `syncChannelConfig`, 필수값 기반 연동 판정, 설치 가이드 조건은 바뀌지
않습니다. 별도 OAuth/API Key 인증 탭과 커스텀 탭도 유지합니다. 숨긴 Config 탭의
옛 링크는 소개로 이동하며, `?tab=settings`는 남아 있는 표준 인증 탭이 있으면
해당 탭을 엽니다. 이 옵션은 접근 권한을 제한하지 않습니다.

```ts
{
  schemaVersion: "v1",
  configScope: "channel",
  providerName: "Example",
  hideSettingsTab: true,
  blocks: [{
    type: "text", key: "connectionId", label: "Connection ID",
    readOnly: true, required: true, storageClass: "config",
  }],
}
```


## 계약

| Function                                           | 필수 여부 | 역할                            |
| -------------------------------------------------- | --------- | ------------------------------- |
| `extension.config.metadata.getConfigSchema`        | 필수      | field, layout, scope, hook 선언 |
| `extension.config.validation.validateStoredConfig` | 선택      | 저장된 canonical value 검증     |

`config:v1`을 등록합니다. AppStore는 값을 저장해 `ctx.config`로 주입합니다. 비밀 field는
`storageClass: "credential"`를 사용합니다. 안정적인 key는 번역하지 않고, 표시 문구만 `ko`,
`ja`, `en` `i18nMap`으로 번역합니다.

## Schema 모델

- `schemaVersion: "v1"`, `configScope: "channel" | "manager"`, provider name, `blocks`를 반환합니다.
- 일반 값은 `storageClass: "config"`, 암호화·mask 값은 `credential`, draft 전용 입력은
  `transient`, 저장할 media reference는 `media`를 사용합니다.
- 독립적인 여러 항목을 저장할 때 `supportsMultiple: true`를 사용합니다. 일반 Function의
  `ctx.config`는 key-to-values map이고 validation에는 선택 항목의 flat values가 들어옵니다.
- `hooks.draftResolverFunctionName`은 draft patch를 만들고 `hooks.validateFunctionName`은 복잡한
  검증을 수행합니다. 둘 다 standalone app Function을 가리킵니다.
- Transient image는 `resolvesTo`로 credential을 만들 수 있습니다. Media image는 binary가 아니라
  reference를 저장합니다.
- `i18nMap`은 표시 문구와 locale별 help URL에만 사용합니다. `key`, `id`, `fieldKey`, choice value,
  renderer, Function 이름은 번역하지 않습니다.

## TypeScript

`@Extension({ name: "config", systemVersion: "v1" })`, `ConfigFunctionNames`,
`GetConfigSchemaOutputSchema`, `ValidateStoredConfigOutputSchema`를 사용합니다. NestJS provider에
class를 등록해야 `ChannelAppModule`이 발견하고 자동 등록합니다. 전체 schema, multi-config,
image, hook, 번역 예제는 [TypeScript Config 레퍼런스](../../../reference/typescript/extensions/config.md)에
있습니다.

매장명이나 주문 수를 저장하지 않고 읽기 전용 필드에 표시하려면
[`config.display.load` 사용 가이드](config-display-values.md)를 확인해주세요.
필드 정의, 조회 Function 등록, 응답 규칙, SDK 스키마 호환성을 설명합니다.

## Go

```go
err := app.Use(config.Extension().
  GetConfigSchema(handler.GetConfigSchema).
  ValidateStoredConfig(handler.ValidateStoredConfig))
```

`extension/config`의 공개 request/response type을 사용합니다. `server.WithAutoRegister()`가 cached
app token으로 선언된 Extension을 등록합니다.

## 인증·WAM·검증

- Credential을 WAM 응답이나 `wamArgs`로 전달하지 않습니다.
- 설정 WAM은 공개 Config native operation을 사용하고 provider 호출은 server Function이 맡습니다.
- Schema hook target은 standalone app Function이지 새로운 Config Function이 아닙니다.
- Schema discovery, 필수 field 누락, 저장 값 검증, secret masking, 세 locale을 테스트합니다.

[Go Extension 레퍼런스](../../../reference/go/EXTENSIONS.md)도 확인하세요.
