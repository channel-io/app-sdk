# Command Guide

The Command Extension lets a user or manager run app capabilities from Channel's desk/front command
UI. Command metadata defines presentation and input; a typed Function referenced by the metadata
performs the action.

## Current contract

| Function or field                        | Required    | Role                                |
| ---------------------------------------- | ----------- | ----------------------------------- |
| `extension.command.metadata.getCommands` | Yes         | Discovers command definitions       |
| `actionFunctionName`                     | Per command | Runs the selected command           |
| `autoCompleteFunctionName`               | Optional    | Returns parameter suggestions       |
| `paramDefinitions[].autoComplete`        | Optional    | Enables suggestions for a parameter |

`commands` may contain at most 30 definitions.

| Metadata field             | Current constraint                                          |
| -------------------------- | ----------------------------------------------------------- |
| `name`                     | 1-30 characters; stable command identifier                  |
| `scope`                    | `desk` or `front`                                           |
| `buttonName`               | Optional, 1-30 characters                                   |
| `description`              | Optional, at most 100 characters                            |
| `nameDescI18nMap`          | Optional localized name and description                     |
| `actionFunctionName`       | Exact full Function name to execute                         |
| `autoCompleteFunctionName` | Optional full autocomplete Function name                    |
| `systemVersion`            | Optional Extension contract version for the target Function |
| `alfMode`                  | Required, `disable` or `recommend`                          |
| `alfDescription`           | Optional, at most 1500 characters                           |
| `paramDefinitions`         | Optional, at most 10 typed parameters                       |
| `enabledByDefault`         | Optional initial visibility after installation              |

A parameter name is 1-20 characters and its type is `string`, `float`, `int`, or `bool`. It may
declare up to 10 static choices, a localization map, and autocomplete. The SDK
`CommandConfigSchema` and `CommandParamDefinitionSchema` are authoritative for exact fields.

## TypeScript

### Registration and discovery

In TypeScript, implement `metadata.getCommands` on
`@Extension({ name: "command", systemVersion: "v1" })`.

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

SDK auto-registration uses an app token to register the `command:v1` Extension, after which
AppStore discovers the metadata and Function schemas. Do not send a separate command-registration
payload through a Native Function from app code. Registration success and metadata/action behavior
are separate; test both.

## Action Function

`actionFunctionName` is the full Function name to call, not the command `name`. Depending on the
surface, the action input contains:

- `chat`: a chat type such as `groupChat`, `userChat`, or `directChat`, plus its ID
- `input`: a validated map keyed by parameter name
- `trigger`: information about the trigger that opened the command
- `language`: the current user's language

Caller and Channel identity are in Function `context`; trust them only after raw-body signature
verification. Metadata, action input, and context are different objects.

An action can return text or an operation result, or open a WAM.

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

Put only a minimal public identifier in `wamArgs` and recheck business authorization in the server
Function called by the WAM. Follow the [WAM guide](../wam.md).

## Autocomplete

Set `autoComplete: true` on the parameter and set `autoCompleteFunctionName` in the command
metadata. The suggestion Function receives the current input state.

```json
{
  "chat": { "type": "groupChat", "id": "group-id" },
  "input": [{ "name": "orderId", "value": "ord", "focused": true }],
  "language": "en"
}
```

Only one argument is `focused: true` at a time. Return choices whose values match the current
parameter type.

```json
{
  "choices": [{ "name": "Order 1001", "value": "order-1001" }]
}
```

Return suggestions quickly and apply a timeout and result limit to provider searches. Other entered
parameters may filter the search, but do not log secrets or raw customer content.

## Go

The Go command builder registers metadata, action, and suggestion Functions together.

```go
err := app.Use(command.Extension().
  GetCommands(handler.GetCommands).
  Suggestions("commands.orders.suggest", handler.Suggest).
  Execute("commands.orders.open", handler.Open))
```

Use `command.Config`, `command.ExecuteRequest`, `command.ActionResult`, and SDK DTOs instead of
recreating wire fields in local structs.

## Validation checklist

- `actionFunctionName` and `autoCompleteFunctionName` match full names in discovery.
- Metadata is validated by `GetCommandsOutputSchema` or the Go command DTOs.
- Actions handle valid input, missing parameters, wrong types, and permission denial.
- Autocomplete handles focus, empty queries, provider timeouts, and empty results.
- WAM actions return only minimal `wamArgs` without secrets.
- Mutation actions are idempotent and prevent duplicate submission.

Read [Function registration](../functions.md), the [WAM guide](../wam.md), the
[TypeScript Command reference](../../../reference/typescript/extensions/command.md), and the
[Go Extension reference](../../../reference/go/EXTENSIONS.md).
