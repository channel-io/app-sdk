# Display fetched values in the setup screen

`config.display.load` fills read-only fields in the setup screen with values fetched by your app.
Use it to show information such as a connected store's name, domain, or order count.
Define the Config fields, then connect the app Function that fetches the values through a hook.

This guide uses TypeScript and NestJS. For the basic Config structure, see
[Config Extension](config.md).

## Data flow and storage

To display a store name, the data flows through these steps:

1. The app's `metadata.getConfigSchema` returns the `storeName` field and the hook.
2. The standard setup screen calls the app Function specified by the hook.
3. The Function fetches the store name from the app's database or an external API.
4. The app returns `{ displayValues: { storeName: "Example Store" } }`.
5. The setup screen validates the field names and value types, then displays the name in `storeName`.

| Data                                | Location                           | Purpose                                             |
| ----------------------------------- | ---------------------------------- | --------------------------------------------------- |
| Field definitions and hook          | Config schema returned by the app  | Define the screen and the Function to call          |
| Original store name                 | App database or external service   | Source queried by the app Function                  |
| Fetched display values              | Memory of the current setup screen | Populate read-only fields                           |
| Ordinary settings saved by the user | AppStore Config storage            | Passed through `ctx.config` in later Function calls |

Display values are excluded from Config save requests, change detection, and `ctx.config`.
Opening the screen again calls the app Function to fetch the values. A change to display values alone
does not enable the Save button. A form containing only display fields has no default Save button.

## Before you start

Both the AppStore server and the standard setup screen must support `config.display.load`.
Upgrading your app's SDK alone does not enable the feature. Confirm server and screen support before
registering the hook. Older servers reject the new hook.

As of September 15, 2026, the SDK's `GetConfigSchemaOutputSchema` defines `hooks` in the older object
format and does not define the `readOnly` field property. The example below uses
`z.record(z.string(), z.unknown())` for the Config schema response to preserve the new hook array and
field properties. Parsing the new response with the existing SDK schema can reject the hook array
or remove field properties.

AppStore still validates the Config schema. A separate `OutputSchema` checks the structure of the
display Function's response, and the standard setup screen validates values against each Config field.

## TypeScript implementation

### 1. Define fields and the hook

Add this code to `config.extension.ts` in your app server. If you already have a Config Extension,
add the fields and hook to that class's schema.

```ts
import { Extension, Func, OutputSchema } from "@channel.io/app-sdk-server";
import { z } from "zod";

@Extension({ name: "config", systemVersion: "v1" })
export class ConfigExtension {
  @Func("metadata.getConfigSchema")
  @OutputSchema(z.record(z.string(), z.unknown()))
  getConfigSchema() {
    return {
      schemaVersion: "v1",
      configScope: "channel",
      supportsMultiple: false,
      providerName: "Example Store",
      hooks: [
        {
          type: "config.display.load",
          actionFunctionName: "commerce.config.getDisplayValues",
        },
      ],
      blocks: [
        {
          type: "text",
          key: "storeName",
          label: "Store name",
          readOnly: true,
          storageClass: "transient",
          overviewSummary: true,
        },
        {
          type: "number",
          key: "orderCount",
          label: "Order count",
          readOnly: true,
          storageClass: "transient",
        },
        {
          type: "switch",
          key: "active",
          label: "Store active",
          readOnly: true,
          storageClass: "transient",
        },
      ],
    };
  }
}
```

`readOnly: true` prevents user edits, and `storageClass: "transient"` prevents persistence.
Both properties are required. The older spelling `readonly: true` is also supported.

A hook connects a trigger to a Function name. `config.display.load` is the fixed hook name;
`commerce.config.getDisplayValues` is a Function name chosen by the app. Using `commerce` in that
name does not require registering a Commerce Extension. Keep any existing hooks in the array.
To call a specific Function version, set `systemVersion` on the hook. If omitted, the existing app
version selection rules apply.

### 2. Implement the Function that returns display values

Add this code to `config-display.functions.ts`. This example returns fixed values so you can check
the behavior. In your app, fetch the values from your database or an external API.

```ts
import { Injectable } from "@nestjs/common";
import {
  Ctx,
  Func,
  Input,
  InputSchema,
  OutputSchema,
  type Context,
} from "@channel.io/app-sdk-server";
import { z } from "zod";

const DisplayInputSchema = z.object({ key: z.string().optional() }).strict();
const DisplayOutputSchema = z.object({ displayValues: z.record(z.string(), z.unknown()) }).strict();

@Injectable()
export class ConfigDisplayFunctions {
  @Func("commerce.config.getDisplayValues")
  @InputSchema(DisplayInputSchema)
  @OutputSchema(DisplayOutputSchema)
  getDisplayValues(@Ctx() ctx: Context, @Input() _params: z.infer<typeof DisplayInputSchema>) {
    if (!ctx.channel?.id) {
      throw new Error("Channel context is required");
    }

    // When fetching real data, return only data belonging to ctx.channel.id.
    return {
      displayValues: {
        storeName: "Example Store",
        orderCount: 0,
        active: false,
      },
    };
  }
}
```

Register this class as an ordinary app Function without `@Extension`.
The string in `@Func` must match the `actionFunctionName` specified earlier.
There is no built-in SDK function named `display` to implement.

The response has exactly one top-level property, `displayValues`. Each key inside it must match a
Config `field.key` exactly, including fields within groups. Return a key containing a dot, such as
`store.name`, as `{ "store.name": "Example Store" }`. You do not need to duplicate each field's
schema in the Function's output schema.

### 3. Register the classes in NestJS

Keep your existing `ChannelAppModule` configuration and add both classes to the module's `providers`.

```ts
import { Module } from "@nestjs/common";
import { ConfigExtension } from "./config.extension";
import { ConfigDisplayFunctions } from "./config-display.functions";

@Module({
  providers: [ConfigExtension, ConfigDisplayFunctions],
})
export class ConfigModule {}
```

Import this `ConfigModule` into the app's root module. With
`ChannelAppModule.forRoot({ ..., autoRegister: true })`, the SDK discovers the classes and registers
the Config Extension and ordinary Function. Keep your Function server, request signature validation,
and authentication configured as described in the [Extension registration guide](../extensions.md).

## Values passed to the Function

| Configuration mode           | When called                              | `params`                        | Where to read saved values |
| ---------------------------- | ---------------------------------------- | ------------------------------- | -------------------------- |
| Single config                | When opened, even without a saved config | `{}`                            | `ctx.config`               |
| Multiple configs             | When opening a saved item                | `{ "key": "saved-config-key" }` | `ctx.config?.[params.key]` |
| New item in multiple configs | Not called before saving                 | None                            | None                       |

Set `supportsMultiple: true` to use multiple configs. After saving a new item, the screen fetches
dynamic choices using the returned config key, then calls the display Function with the same key.
With multiple configs, ordinary Functions receive `ctx.config` as a map from keys to values, even
when only one item exists. Do not read it as a single config, such as `ctx.config.storeName`.

If no config has been saved or values needed for an external lookup are not ready, the app Function
decides how to handle that state. For an expected empty state, such as before the first connection,
it can return `{ displayValues: {} }`. To clear a previously displayed value, return `null` for that
key. The platform does not automatically supply missing Function inputs or defaults.

### Channel and manager scopes

Both `configScope: "channel"` and `configScope: "manager"` are supported.
Do not add `scope`, `channelId`, or `managerId` to the display Function's `params`.

- Read the channel ID from the authenticated `ctx.channel.id`.
- Manager settings belong to the caller identified by `ctx.caller.id` when
  `ctx.caller.type === "manager"`.
- A manager-scoped Function must return an error if manager context is missing.
- When looking up app or external data using a multi-config key, verify that it belongs to the
  relevant channel and manager. The key itself does not grant access.

For manager scope, check the following condition before fetching data:

```ts
if (ctx.caller?.type !== "manager" || !ctx.caller.id) {
  throw new Error("Manager context is required");
}
const managerId = ctx.caller.id;
```

The display Function is for fetching data. Do not save settings or modify external data during the call.

## Response rules

Include only non-sensitive fields with both `readOnly` and `transient` set as shown above.
Ordinary persisted fields, credential fields, password fields, fields with `sensitive: true`, and
fields with `resolvesTo` are not allowed.

| Field type           | Accepted value                                                                                                                                    |
| -------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| `text`, `textarea`   | String                                                                                                                                            |
| `number`             | Finite number                                                                                                                                     |
| `switch`, `checkbox` | `true` or `false`                                                                                                                                 |
| `select`, `radio`    | A current choice's `value`, or an empty string                                                                                                    |
| `multiselect`        | Array of current choices' `value` entries                                                                                                         |
| `phone`              | Object with string `countryCode` and `number` properties                                                                                          |
| `address`            | Object with string `name`, `zipcode`, `address1`, and `address2` properties, plus a `cellphone` in the `phone` structure                          |
| `image`              | Object with `name`, `size`, `contentType`, and at least one of `dataUrl`, `url`, or `previewUrl`. An array of these objects when `multiple: true` |

For images, `name`, `contentType`, and any URL values must be strings. `size` must be a finite,
non-negative number. All field types listed above accept `null` to clear the field. Other field
types are not supported.

| Response                                                                | Screen behavior                                                   |
| ----------------------------------------------------------------------- | ----------------------------------------------------------------- |
| `{ "displayValues": {} }`                                               | Keep previously fetched, valid display values for the same target |
| `{ "displayValues": { "storeName": null } }`                            | Clear the store name without reapplying `defaultValue`            |
| `{ "displayValues": { "orderCount": 0, "active": false } }`             | Display `0` and `false` as returned                               |
| `{ "displayValues": { "storeName": "" } }`                              | Apply the empty string                                            |
| `{}` or `{ "displayValues": null }`                                     | Invalid response format                                           |
| A response containing any undefined key, wrong type, or persisted field | Reject the entire response                                        |

Omitted keys retain their previous display values if those values are still valid under the current
field definitions. `null` sets a field to its empty state: `false` for switches and checkboxes,
and `[]` for multiselects.

For dynamic choices, connect an existing choices Function with `choicesSource.type: "function"`.
The screen completes the initial choices lookup before validating display values. For example, if a
choice is `{ label: "Basic plan", value: "basic" }`, the display Function returns `"basic"`.
If a previously displayed selection is absent from the updated choices, the screen clears it.

## Refresh and failure handling

The Function runs when entering the setup screen, reloading an existing config, refreshing after a
connection completes, or retrying a display lookup. It does not run on every input edit.

- If the hook is omitted, the screen skips the display Function and keeps existing Config behavior.
- If the hook is registered but its target Function is missing or the call fails, the screen shows
  an error banner with a retry action.
- A failed lookup for the same target retains the last successful values.
- Retrying display values or refreshing after OAuth completes preserves ordinary settings the user
  is currently editing.
- Responses arriving after the user switches to another config or closes the screen are ignored.

A successful display lookup does not mean that settings are valid or a connection is complete.
Connection state is determined by the existing Config validation and OAuth state.

### Values in summary screens

For a single config, set `overviewSummary: true` on a field to show its display value in the saved
connection summary. As of September 15, 2026, multiple configs show display values in the detail
screen, but list cards use only persisted values and do not show values from this hook.
This feature alone cannot provide display values for list cards.

## Verify the behavior

After registering the app, check the following in the standard setup screen:

1. Open a single config without saved settings. The Function receives `{}`, and the screen shows
   the store name, order count `0`, and switch value `false`.
2. Display fields cannot be edited, and fetching display values alone does not enable Save.
3. If the app has ordinary persisted fields, save them and confirm that `ctx.config` excludes display values.
4. Empty `displayValues` retains previous values; `null` clears the specified field.
5. An undefined key or wrong value type produces an error without partially applying the response.
6. Retrying a failed lookup preserves ordinary settings being edited.
7. Multiple configs skip the call before saving and pass the selected key after saving.
8. Manager scope fetches only the authenticated manager's data and rejects requests without manager context.
