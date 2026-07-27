# Config Extension

채널·매니저 단위 설정, API key, `client_credentials`, shop ID와 credential은 Config로
관리합니다. Config는 신규 앱의 표준 설정 화면입니다.

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
