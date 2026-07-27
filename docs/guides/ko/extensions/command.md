# Command 가이드

Command Extension은 user 또는 manager가 Channel의 desk/front command UI에서 앱 기능을 실행하게
합니다. Command metadata는 노출 방식과 입력을 정의하고, 실제 동작은 metadata가 가리키는 typed
Function이 처리합니다.

## 현재 계약

| Function 또는 field                      | 필수 여부      | 역할                               |
| ---------------------------------------- | -------------- | ---------------------------------- |
| `extension.command.metadata.getCommands` | 필수           | Command definition을 discovery     |
| `actionFunctionName`                     | Command별 필수 | 선택된 command 실행                |
| `autoCompleteFunctionName`               | 선택           | Parameter suggestion 반환          |
| `paramDefinitions[].autoComplete`        | 선택           | 해당 parameter의 suggestion 활성화 |

`commands`에는 최대 30개의 definition을 반환할 수 있습니다.

| Metadata field             | 현재 제약                                          |
| -------------------------- | -------------------------------------------------- |
| `name`                     | 1-30자, 안정적인 command identifier                |
| `scope`                    | `desk` 또는 `front`                                |
| `buttonName`               | 선택, 1-30자                                       |
| `description`              | 선택, 최대 100자                                   |
| `nameDescI18nMap`          | 선택, 언어별 name과 description                    |
| `actionFunctionName`       | 실행할 정확한 전체 Function 이름                   |
| `autoCompleteFunctionName` | 선택, autocomplete 전체 Function 이름              |
| `systemVersion`            | 선택, target Function의 Extension contract version |
| `alfMode`                  | 필수, `disable` 또는 `recommend`                   |
| `alfDescription`           | 선택, 최대 1500자                                  |
| `paramDefinitions`         | 선택, 최대 10개 typed parameter                    |
| `enabledByDefault`         | 선택, 설치 후 기본 노출 여부                       |

Parameter name은 1-20자이며 type은 `string`, `float`, `int`, `bool` 중 하나입니다. 최대 10개의
static choice, localization map, autocomplete를 선택적으로 선언할 수 있습니다. 정확한 field는 SDK의
`CommandConfigSchema`와 `CommandParamDefinitionSchema`가 기준입니다.

## TypeScript

### 등록과 discovery

TypeScript는 `@Extension({ name: "command", systemVersion: "v1" })`의
`metadata.getCommands` Function을 구현합니다.

```ts
@Extension({ name: "command", systemVersion: "v1" })
export class CommandExtension {
  @Func("metadata.getCommands")
  @InputSchema(z.object({}))
  @OutputSchema(GetCommandsOutputSchema)
  getCommands() {
    return {
      commands: [
        {
          name: "orders",
          scope: "desk",
          description: "Open an order",
          actionFunctionName: "commands.orders.open",
          alfMode: "disable",
          enabledByDefault: true,
          paramDefinitions: [
            { name: "orderId", type: "string", required: true },
          ],
        },
      ],
    };
  }
}
```

SDK의 auto-registration은 app token으로 `command:v1` Extension을 등록하고 AppStore가 metadata와
Function schema를 discovery하게 합니다. 앱 코드에서 별도의 command 등록 payload를 Native
Function으로 직접 전송하지 마세요. Extension 등록 성공과 metadata/action 동작은 별개이므로 둘 다
테스트해야 합니다.

## Action Function

`actionFunctionName`은 command의 `name`이 아니라 실제로 호출할 전체 Function 이름입니다. Action
input에는 surface에 따라 다음 값이 들어옵니다.

- `chat`: `groupChat`, `userChat`, `directChat` 같은 chat type과 ID
- `input`: parameter name을 key로 하는 검증된 입력 map
- `trigger`: command를 연 trigger 정보
- `language`: 현재 user의 language

Caller와 Channel identity는 Function `context`에 있으며 raw body signature 검증 후에만 신뢰합니다.
Metadata, action input, context는 서로 다른 객체이므로 섞지 마세요.

Action은 text/operation result를 반환하거나 WAM을 열 수 있습니다.

```json
{
  "type": "wam",
  "attributes": {
    "appId": "public-app-id",
    "name": "order",
    "wamArgs": { "orderId": "order-1" }
  }
}
```

`wamArgs`에는 browser에 공개해도 되는 최소 식별자만 넣고 business authorization은 WAM이 호출하는
server Function에서 다시 확인하세요. WAM 구현은 [WAM 가이드](../wam.md)를 따릅니다.

## Autocomplete

Autocomplete parameter에는 `autoComplete: true`를 설정하고 command metadata에
`autoCompleteFunctionName`을 지정합니다. Suggestion Function input은 현재 입력 상태를 전달합니다.

```json
{
  "chat": { "type": "groupChat", "id": "group-id" },
  "input": [{ "name": "orderId", "value": "ord", "focused": true }],
  "language": "ko"
}
```

한 시점에는 하나의 argument만 `focused: true`입니다. 결과는 현재 parameter type과 맞는 choice를
반환합니다.

```json
{
  "choices": [{ "name": "Order 1001", "value": "order-1001" }]
}
```

Suggestion은 빠르게 반환하고 provider 검색에는 timeout과 result limit을 적용하세요. 사용자가 입력한
다른 parameter를 filter에 쓸 수 있지만 secret이나 고객 원문을 log에 남기지 마세요.

## Go

Go는 command builder가 metadata, action, suggestion Function을 함께 등록합니다.

```go
err := app.Use(command.Extension().
  GetCommands(handler.GetCommands).
  Suggestions("commands.orders.suggest", handler.Suggest).
  Execute("commands.orders.open", handler.Open))
```

`command.Config`, `command.ExecuteRequest`, `command.ActionResult`와 SDK가 제공하는 DTO를 사용하고
wire field를 자체 struct로 다시 만들지 마세요.

## 검증 체크리스트

- `actionFunctionName`과 `autoCompleteFunctionName`이 discovery된 전체 이름과 일치합니다.
- Metadata는 `GetCommandsOutputSchema` 또는 Go command DTO로 검증됩니다.
- Action은 정상 입력, 누락된 parameter, 잘못된 type, 권한 거부를 처리합니다.
- Autocomplete는 focus, 빈 검색어, provider timeout, 빈 결과를 처리합니다.
- WAM action은 secret이 없는 최소 `wamArgs`만 반환합니다.
- Mutation action은 idempotent하게 만들고 중복 제출을 방지합니다.

[Function 등록](../functions.md), [WAM 가이드](../wam.md),
[TypeScript Command 레퍼런스](../../../reference/typescript/extensions/command.md),
[Go Extension 레퍼런스](../../../reference/go/EXTENSIONS.md)를 함께 확인하세요.
