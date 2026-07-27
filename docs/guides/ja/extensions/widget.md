# Widget Extension

対応する Desk/front surface に context-sensitive UI または action を追加するときに使います。

## Contract

| Function                               | 必須              | 役割                              |
| -------------------------------------- | ----------------- | --------------------------------- |
| `extension.widget.metadata.getWidgets` | 必須              | Surface と action metadata を公開 |
| Metadata の `actionFunctionName`       | Widget ごとに必須 | Action result（多くは WAM）を返す |

Chat、user、manager field は surface によって異なります。選択した surface の公開 contract が
保証しない field は optional として扱います。

Widget は最大 30 件です。Name は 1-20 文字の ASCII letter、`_`、`-` のみ、scope は `front` または
`desk`、`widgetType` は `wam` または Desk-only `snippet` です。Stable name と localized display
name/description を使い、`snippetApiUrl` が必要な場合は専用 snippet registration contract に従います。

## TypeScript

Metadata には `@Extension({ name: "widget", systemVersion: "v1" })`、action には standalone
Function を使います。`GetWidgetsOutputSchema` と `WidgetActionResultSchema` で検証します。
[TypeScript Widget reference](../../../reference/typescript/extensions/widget.md) を参照してください。

## Go

```go
err := app.Use(widget.Extension().
  GetWidgets(handler.GetWidgets).
  Action("example.widget.open", handler.Open))
```

## 認証・WAM・検証

- Interactive content は WAM で提供し、provider credential と privileged token は server に置きます。
- Browser から受け取った resource ID を app/channel token と組み合わせる前に server で再認可します。
- Widget install/remove lifecycle が必要な場合だけ Hook と組み合わせます。
- 全 surface、optional context 不足、permission denial、loading/error UI、重複 click を test します。

[WAM reference](../../../reference/typescript/WAM.md) も参照してください。
