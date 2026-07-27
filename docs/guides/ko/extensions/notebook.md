# Notebook Extension

Version이 있는 app-managed notebook과 cell definition을 공개할 때 사용합니다.

## 계약

`extension.notebook.core.getNotebooks`가 필수이며 등록은 두 단계입니다.

1. `notebook:v1`을 등록합니다.
2. Cached app token으로 `registerAppNotebooks`를 호출해 definition을 sync합니다.

각 notebook은 stable key, 양의 정수 version, title, optional initial visibility, cell을 포함합니다.
지원 cell type은 `markdown`, `sql`, `python`, `input`, `chart`, `table`, `single_value`이며 optional
tab과 row/column layout은 stable cell key를 참조합니다.

## TypeScript

`@Extension({ name: "notebook", systemVersion: "v1" })`, `GetNotebooksInputSchema`,
`GetNotebooksResponseSchema`를 사용합니다. Notebook과 cell key를 안정적으로 유지합니다.
[TypeScript Notebook 레퍼런스](../../../reference/typescript/extensions/notebook.md)를 확인하세요.

## Go

```go
err := app.Use(notebook.Extension().GetNotebooks(handler.GetNotebooks))
```

Auto-registration 후 통제된 startup 또는 release 단계에서 Go native client의 notebook sync를
호출합니다.

## 보안·검증

- Definition 변경 시 version을 올리고 서로 다른 content에 같은 version을 재사용하지 않습니다.
- 외부 Markdown, URL, rendered data를 untrusted input으로 취급합니다.
- Definition과 cell에 credential이나 private record를 넣지 않습니다.
- Discovery, extension registration, secondary sync, version readback, invalid cell, 삭제 notebook,
  localization, safe rendering을 테스트합니다.

[Go native 레퍼런스](../../../reference/go/NATIVE.md)도 확인하세요.
