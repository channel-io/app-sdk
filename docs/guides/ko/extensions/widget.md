# Widget Extension

지원되는 Desk 또는 front surface에 context 기반 UI나 action을 추가할 때 사용합니다.

## 계약

| Function                               | 필수 여부     | 역할                           |
| -------------------------------------- | ------------- | ------------------------------ |
| `extension.widget.metadata.getWidgets` | 필수          | Surface와 action metadata 공개 |
| Metadata의 `actionFunctionName`        | Widget별 필수 | Action result, 주로 WAM 반환   |

Chat, user, manager field는 surface에 따라 다릅니다. 선택한 surface의 공개 contract가 보장하지
않으면 optional로 처리합니다.

Widget은 최대 30개를 반환합니다. Name은 1-20자의 ASCII letter, `_`, `-`만 허용하고 scope는
`front` 또는 `desk`, `widgetType`은 `wam` 또는 Desk 전용 `snippet`입니다. Stable name과 localized
display name/description을 사용하며 `snippetApiUrl`이 필요하면 전용 snippet registration contract를
따릅니다.

## TypeScript

Metadata에는 `@Extension({ name: "widget", systemVersion: "v1" })`을, action에는 standalone
Function을 사용합니다. `GetWidgetsOutputSchema`와 `WidgetActionResultSchema`로 검증합니다.
[TypeScript Widget 레퍼런스](../../../reference/typescript/extensions/widget.md)를 확인하세요.

## Go

```go
err := app.Use(widget.Extension().
  GetWidgets(handler.GetWidgets).
  Action("example.widget.open", handler.Open))
```

## 인증·WAM·검증

- 상호작용 content는 WAM으로 제공하고 provider credential과 privileged token은 server에 둡니다.
- Browser에서 받은 resource ID를 app/channel token과 함께 사용하기 전에 server에서 다시 권한을
  검증합니다.
- Widget 설치·삭제 lifecycle 작업이 필요할 때만 Hook과 함께 사용합니다.
- 모든 surface, optional context 누락, permission denial, loading/error UI, 중복 click을 테스트합니다.

[WAM 레퍼런스](../../../reference/typescript/WAM.md)도 확인하세요.
