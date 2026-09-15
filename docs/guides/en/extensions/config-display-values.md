# Using config.display.load

`config.display.load` is a hook that displays data fetched by your app in read-only fields on the
standard setup screen. Your app returns the values, and the screen fills existing Config fields.
You continue to define fields through the existing Config schema.

## When to use it

Use this hook to display information that meets all of these conditions:

- The source data is managed in your app's database or an external service.
- Users need to view the values, without editing them in the setup screen.
- The values do not need to be saved in Config or passed to later Function calls through `ctx.config`.

| Required behavior                                    | Feature to use         |
| ---------------------------------------------------- | ---------------------- |
| Display app-fetched values as read-only              | `config.display.load`  |
| Save user input for the app to use                   | Ordinary Config fields |
| Compute or adjust other inputs when an input changes | `config.draft.resolve` |
| Determine whether saved settings are usable          | Config validation      |

Display values live only in the current screen's memory and are fetched again when the screen is
reopened. Changes to display values alone do not enable Save. A form containing only display fields
has no default Save button.

## How to use it

### 1. Specify the display fields

Define the fields in `blocks` in your existing `metadata.getConfigSchema` response with these properties:

| Property       | Setting                                                     |
| -------------- | ----------------------------------------------------------- |
| `key`          | The same key the Function will return for the display value |
| `type`         | An existing Config field type that matches the value        |
| `readOnly`     | `true`                                                      |
| `storageClass` | `"transient"`                                               |

`readOnly` prevents user edits, and `transient` excludes the field from storage. Both are required
for a field to receive display values. The older spelling `readonly: true` is also supported.
Password fields, credential fields, fields with `sensitive: true`, and fields with `resolvesTo` cannot be used.

### 2. Connect the Function that fetches the values

Add this entry to the `hooks` array in the same schema response. Replace `<app-function-name>` with
an actual registered app Function name, and keep any existing hooks in the array.

```json
{
  "type": "config.display.load",
  "actionFunctionName": "<app-function-name>"
}
```

`config.display.load` is the fixed hook name. `actionFunctionName` is the name of the ordinary app
Function to call, chosen by your app. Once the hook is added, the standard setup screen calls the
Function. You do not need to write a separate WAM call.

### 3. Fetch and return values from the app Function

In the connected Function, fetch data belonging to the authenticated caller's scope and return
`{ displayValues: { [fieldKey]: value } }`. `fieldKey` is the field's `key` from step 1.
The Function returns only values for existing fields; it does not create fields or return a schema.

In the TypeScript SDK, register an ordinary app Function with `@Func` and use the same name in
`actionFunctionName`. Add the Function class to NestJS `providers`.
See [Function registration](../functions.md) for details.

Use these input and output schemas with the Function's `@InputSchema` and `@OutputSchema` decorators.
Import `z` from `zod`.

```ts
const DisplayLoadInputSchema = z
  .object({ key: z.string().optional() })
  .strict();
const DisplayLoadOutputSchema = z
  .object({ displayValues: z.record(z.string(), z.unknown()) })
  .strict();
```

The response has exactly one top-level property, `displayValues`. The setup screen validates each
value against its Config field definition, so you do not need to duplicate every field in the output
schema. The Function only fetches data; it must not save settings or modify external data.

## Values passed to the Function

| Configuration mode             | `params`                          | Location of saved values   |
| ------------------------------ | --------------------------------- | -------------------------- |
| Single config                  | `{}`                              | `ctx.config`               |
| Saved item in multiple configs | `{ "key": "<saved-config-key>" }` | `ctx.config?.[params.key]` |
| New item in multiple configs   | Not called before saving          | None                       |

Single config calls run even when no values have been saved. Set `supportsMultiple: true` to use
multiple configs. After a new item is saved, the call uses its returned key. For multiple configs,
`ctx.config` is a map from keys to values, even if only one item exists. Unsaved input being edited
is not passed in the display Function's `params`.

Both channel and manager scopes are supported. Read the channel ID from the authenticated
`ctx.channel.id`. Manager scope refers to the caller's own settings, identified by `ctx.caller.id`
when `ctx.caller.type === "manager"`. The Function must return an error if manager context is missing.
Do not add `scope`, `channelId`, or `managerId` to `params`. When looking up data using a multi-config
key, verify that it belongs to the relevant channel and manager.

Your app handles cases where the values needed for a lookup are not ready. If there is nothing to
display, such as before the first connection, return `{ displayValues: {} }`. The platform does not
create missing inputs. To also clear previously displayed values, return `null` for those keys.

## Response rules

Response keys must exactly match existing `field.key` values, including fields inside groups.
Use keys containing dots as-is; they are not interpreted as paths into nested objects.

| Field type           | Value to return                                                                                                                                                    |
| -------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `text`, `textarea`   | String                                                                                                                                                             |
| `number`             | Finite number                                                                                                                                                      |
| `switch`, `checkbox` | Boolean                                                                                                                                                            |
| `select`, `radio`    | A current choice's `value`, or an empty string                                                                                                                     |
| `multiselect`        | Array of current choices' `value` entries                                                                                                                          |
| `phone`              | Object with string `countryCode` and `number` properties                                                                                                           |
| `address`            | Object with string `name`, `zipcode`, `address1`, and `address2` properties, plus a `cellphone` in the `phone` structure                                           |
| `image`              | Object with string `name` and `contentType`, finite non-negative `size`, and at least one string `dataUrl`, `url`, or `previewUrl`. An array when `multiple: true` |

All field types listed above accept `null` to clear the field. Other types are not supported.
The screen completes the initial dynamic choices lookup before validating display values. After a
new item is saved, it also fetches choices with the same key before validating display values.
A previous selection is cleared if it is no longer valid in the updated choices.

| Returned content                                  | Screen behavior                                                                                   |
| ------------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| Omitted key or empty `displayValues`              | Keep previous values for the same target that are still valid under the current field definitions |
| `null`                                            | Clear the field without reapplying `defaultValue`                                                 |
| `false`, `0`, `""`                                | Apply as returned if valid for the field type                                                     |
| `{}` or `displayValues: null`                     | Invalid response format                                                                           |
| Any undefined key, wrong type, or persisted field | Reject the entire response without applying any part                                              |

Clearing a switch or checkbox with `null` sets it to `false`; clearing a multiselect sets it to `[]`.

## Call timing and failure handling

The Function runs when entering the setup screen, reloading an existing config, refreshing after a
connection completes, or retrying a display lookup. It does not run on every input edit.

- Without the hook, the call is skipped and existing Config behavior is unchanged.
- A missing Function, failed lookup, or invalid response produces an error banner with a retry action.
- A failed lookup for the same target retains the last successful values.
- Retrying display values or refreshing after OAuth completes preserves ordinary settings being edited.
- Responses arriving after the user switches targets or closes the screen are ignored.

Display values are excluded from save requests, `ctx.config`, Config validation, and connection
completion checks. A visible value alone is not proof of a successful connection.

## Before enabling the hook

Both the AppStore server and the standard setup screen must support this hook. An SDK update alone
does not enable it, and older servers reject it.

As of September 15, 2026, SDK 0.24.2's `GetConfigSchemaOutputSchema` does not define the hook array or
`readOnly`. If you use this helper, set the output schema for `metadata.getConfigSchema` to
`@OutputSchema(z.record(z.string(), z.unknown()))` to preserve these properties. AppStore still
validates the Config schema and display responses.

For a single config, display values can appear in the saved connection summary when the field has
`overviewSummary: true`. As of September 15, 2026, multiple configs show display values only in the
detail screen. List cards use persisted values and do not show values from this hook.
