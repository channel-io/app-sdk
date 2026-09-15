# Display connection details in the setup screen

## What does this feature do?

This feature displays information fetched from your app or an external service in Channel Talk's
standard setup screen. Users can check details your app provides, such as the name and domain of a
connected store.

Connect an app function to the `config.display.load` hook, and the setup screen calls the function
and displays the returned values in read-only fields. You can use existing Config fields without
writing separate UI code.

The displayed values are not saved to Config. Your app or the external service manages the source
data, and the setup screen shows the fetched results.

## When should you use it?

Use this feature when you want users to check information your app already has, without entering
it themselves.

- **Confirm the connected store**: display its name and domain so users can see which store is connected.
- **Show information managed by an external service**: fetch and display the current plan or contract expiration date.
- **Show your app's processing status**: fetch and display the last sync time or the number of orders processed.

The setup screen fetches the values when it opens and when it refreshes after settings are saved or
a connection is completed. It does not refresh them periodically while the screen stays open or
fetch them each time a user changes an input.

Use regular Config fields if you need to save user input and use it in later app function calls.

## Example: display connected store details

This example displays the store name and domain in an e-commerce integration app. Users can open
the app settings to check that the correct store is connected.

| Field      | Displayed value  |
| ---------- | ---------------- |
| Store name | Channel Shop     |
| Domain     | shop.example.com |

You need fields to display the values and an app function to fetch the store details.

### 1. Connect the display fields and the fetch function

Define the store name and domain fields in the `metadata.getConfigSchema` response, and specify
the function to call in `hooks`.

```json
{
  "schemaVersion": "v1",
  "configScope": "channel",
  "providerName": "Shop",
  "hooks": [
    {
      "type": "config.display.load",
      "actionFunctionName": "shop.getDisplayValues"
    }
  ],
  "blocks": [
    {
      "type": "text",
      "key": "storeName",
      "label": "Store name",
      "readOnly": true,
      "storageClass": "transient",
      "overviewSummary": true
    },
    {
      "type": "text",
      "key": "storeDomain",
      "label": "Domain",
      "readOnly": true,
      "storageClass": "transient",
      "overviewSummary": true
    }
  ]
}
```

Set both `readOnly: true` and `storageClass: "transient"` on each field. These settings prevent
users from editing the values and exclude them from storage.

This example uses a single configuration. Adding `overviewSummary: true` also displays the details
in the saved connection's summary screen.

### 2. Return the store details from your app function

Register `shop.getDisplayValues` as an ordinary app function and implement it to fetch the store
connected to the channel. You can choose the function name, but it must match `actionFunctionName`.

In this example, the function receives `{}` as its input. Identify the channel using
`ctx.channel.id` from the authenticated call context. Your app function handles the data lookup
and access checks.

Return the fetched values in the following format:

```json
{
  "displayValues": {
    "storeName": "Channel Shop",
    "storeDomain": "shop.example.com"
  }
}
```

The keys in `displayValues` must match the `key` values of the fields you defined. With this
response, the setup screen displays "Channel Shop" under "Store name" and "shop.example.com"
under "Domain".

The function only fetches information to display. It does not save settings or change external data.

### 3. Handle missing information and fetch failures

If there is no information to display, such as before a store is connected, you can return:

```json
{
  "displayValues": {}
}
```

An empty object keeps previous display values for the same target that are still valid under the
current field definitions. To clear a previous value, return `null` for its key.

```json
{
  "displayValues": {
    "storeName": null,
    "storeDomain": null
  }
}
```

If the fetch fails, the setup screen displays an error and a retry button. It keeps the last
successfully fetched values for the same target, if available.

Display values are not included in save requests or in `ctx.config` for later function calls.
Connection completion is validated separately, so displaying these details does not mean that
the connection succeeded.

---

This feature requires an AppStore server and standard setup screen that support
`config.display.load`. If you use `GetConfigSchemaOutputSchema` from SDK 0.24.2, set the output
schema of `metadata.getConfigSchema` to `@OutputSchema(z.record(z.string(), z.unknown()))` to
preserve the `hooks` array and `readOnly` properties.
