# Hook Extension

Use the hook extension when AppStore or Desk should call your app on lifecycle events.

## Required Function

- `extension.hook.metadata.getHooks`

Hook handlers themselves are plain app functions referenced by `actionFunctionName`.

## Supported Hook Types

Current SDK schema supports:

- `app.installed`
- `app.uninstalled`
- `command.toggle`
- `config.saved`
- `config.deleted`
- `widget.installed`
- `widget.uninstalled`
- `webhook.received`

Widget hooks must include a `targetId` that matches the widget name. App,
command, and config hooks must not include a `targetId`. Public webhook hooks
must include a public `targetId` that is 1-64 characters, starts with an
alphanumeric character, and otherwise contains only `A-Z`, `a-z`, `0-9`, `.`,
`_`, or `-`. `webhook.executionScope` is either `app` (the default) or
`manager`. App-scoped hooks must include a high-entropy `webhook.endpointToken`.
Manager-scoped hooks must omit it because AppStore issues a bound endpoint URL.
The `webhook` field is not allowed on other hook types.

## Public Webhook Ingress

Use `webhook.received` when an external service must call an app function. For a
single app-level endpoint:

```ts
const endpointToken = process.env.WEBHOOK_ENDPOINT_TOKEN;
if (!endpointToken) throw new Error("WEBHOOK_ENDPOINT_TOKEN is required");

return {
  hooks: [
    {
      type: "webhook.received",
      targetId: "bcart.orders",
      actionFunctionName: "hooks.bcart.receive",
      systemVersion: "v1",
      webhook: { endpointToken },
    },
  ],
};
```

Generate the endpoint token with a cryptographically secure random generator. It
must contain 32-128 URL-safe characters (`A-Z`, `a-z`, `0-9`, `_`, or `-`). AppStore
stores only its SHA-256 hash.

For a callback that must run as the manager who connected an external account,
declare manager scope without an endpoint token:

```ts
return {
  hooks: [
    {
      type: "webhook.received",
      targetId: "provider.events",
      actionFunctionName: "hooks.provider.receive",
      systemVersion: "v1",
      webhook: { executionScope: "manager" },
    },
  ],
};
```

The Hook remains an app-level metadata definition. AppStore creates endpoint
bindings per installation, Channel, and manager, then injects them into any
manager Function context:

```ts
const callbackUrl = context.webhooks?.["provider.events"]?.url;
if (!callbackUrl) throw new Error("manager webhook endpoint is unavailable");
```

Register that URL with the external provider while handling the manager's
connect action. Do not derive manager or Channel identity from webhook payloads,
headers, or query parameters; AppStore resolves both from the endpoint binding.

For app-scoped Hooks, providers send asynchronous `POST` requests to the URL
formed with the app-provided `endpointToken`:

```text
https://app-store-api.channel.io/public/v1/apps/{appId}/hooks/{targetId}/{endpointToken}
```

For manager-scoped Hooks, register the complete
`context.webhooks[targetId].url` value instead. Do not construct that URL or
append an app-provided `endpointToken`; AppStore issues the opaque endpoint
binding URL.

AppStore returns `202 Accepted` and calls the configured ordinary app function
with the delivery ID, app ID, target ID, receive time, and original request. The
request includes headers, query parameters, parsed JSON body when available, and
`rawBodyBase64` for provider-specific signature verification. App-scoped hooks
use a system caller and no resolved Channel. Manager-scoped hooks use the bound
manager and Channel and receive the normal manager OAuth, API-key, and config
context.

Manager endpoint bindings are revoked when the app is uninstalled or deleted,
or when the target is removed or changed back to app scope.

The v1 ingress does not support synchronous GET/body challenges or forwarding the
app function result to the provider response.

## Registration

Hooks register through:

- `registerExtension("hook", "v1")`

AppStore currently backs this with app-level install, command toggle, config
lifecycle, widget installation, and app- or manager-scoped public webhook registrations.

## Good Fit

Use hooks for:

- app bootstrap and cleanup
- syncing external resources when the app is installed
- reacting to config save and delete lifecycle events
- reacting to command enable/disable
- provisioning resources when a specific widget is installed
- receiving external provider events without operating a separate webhook gateway
