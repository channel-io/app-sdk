# Custom Tab Extension

Command나 Widget보다 넓고 오래 유지되는 app-owned Desk surface가 필요할 때 사용합니다.

## 계약

| Function                                     | 필수 여부  | 역할                         |
| -------------------------------------------- | ---------- | ---------------------------- |
| `extension.customtab.metadata.getCustomTabs` | 필수       | 안정적인 tab definition 공개 |
| Metadata의 `actionFunctionName`              | Tab별 필수 | Tab WAM을 열거나 준비        |

Tab key는 release 간 안정적으로 유지합니다. Key와 Function 이름은 번역하지 않고 표시 문구만
번역합니다.

Tab은 최대 5개를 반환합니다. Name은 1-30자의 ASCII letter, `_`, `-`만 허용하며 각 definition은
action Function, optional system version, optional locale-to-name map을 포함합니다.

## TypeScript

Metadata에는 `@Extension({ name: "customtab", systemVersion: "v1" })`을, action에는 standalone
Function을 사용합니다. `GetCustomTabsOutputSchema`와 `CustomTabActionResultSchema`로 검증합니다.
[TypeScript Custom tab 레퍼런스](../../../reference/typescript/extensions/customtab.md)를 확인하세요.

## Go

```go
err := app.Use(customtab.Extension().
  GetCustomTabs(handler.GetCustomTabs).
  Action("example.tab.open", handler.Open))
```

## 인증·WAM·검증

- 설정된 WAM root에서 tab을 제공하고 WAM name과 안전한 `wamArgs`만 반환합니다.
- Tab이 보인다는 사실은 권한 증명이 아니므로 privileged server operation마다 다시 인가합니다.
- Host navigation, remount, unsupported surface, expired context를 처리합니다.
- Registration, tab visibility, WAM load, permission, refresh, error recovery를 테스트합니다.

[WAM 레퍼런스](../../../reference/typescript/WAM.md)도 확인하세요.
