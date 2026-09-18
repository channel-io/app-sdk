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
- `oauth.connected`
- `oauth.disconnected`
- `oauth.beforeAuthorization`
- `oauth.afterAuthorization`
- `userChat.opened`
- `teamChat.messageCreated`

Widget hooks must include a `targetId` that matches the widget name. App,
command, and config hooks must not include a `targetId`. Public webhook hooks
must include a public `targetId` that is 1-64 characters, starts with an
alphanumeric character, and otherwise contains only `A-Z`, `a-z`, `0-9`, `.`,
`_`, or `-`. `webhook.executionScope` is either `app` (the default) or
`manager`. App-scoped hooks must include a high-entropy `webhook.endpointToken`.
Manager-scoped hooks must omit it because AppStore issues a bound endpoint URL.
The `webhook` field is not allowed on other hook types.

OAuth lifecycle Hooks use `actionFunctionName`, optional `systemVersion`, and
optional `authScope: "channel" | "manager"`; omitting `authScope` keeps the shared
fallback. A matching scoped Hook takes precedence over that fallback. See
[Scope-specific OAuth hooks](#scope-specific-oauth-hooks) for registration rules.
They must not include `targetId`, `webhook`, or an endpoint token.
On a manager OAuth event, identify the manager from `params.managerId`.
`context.caller` is still the system caller (`{ type: "system", id: "system" }`),
not the manager. `oauth.connected` receives the newly issued provider access
token in `context.authToken`.

For a manager `oauth.connected` event, a separately declared manager-scoped
`webhook.received` target may be available at
`context.webhooks?.[targetId]?.url`. Use it as an optional provider-callback
fast path only. The URL can be absent and Hook delivery can fail, so reconcile
manager targets by polling as the recovery path. Do not expect a webhook URL
for channel OAuth or `oauth.disconnected`.

## Optional OAuth Flow Hooks

Register either hook through the existing `metadata.getHooks` function. No new
method is required on `OAuthExtensionInterface` or `HookExtensionInterface`.

```ts
return {
  hooks: [
    {
      type: "oauth.beforeAuthorization",
      actionFunctionName: "connection.beforeOAuth",
      redirectOrigins: ["https://setup.example.com"],
    },
    {
      type: "oauth.afterAuthorization",
      actionFunctionName: "connection.afterOAuth",
      redirectOrigins: ["https://setup.example.com"],
    },
  ],
};
```

Both TypeScript hook types declare `redirectOrigins`; use `[]` for a continue-only handler.
Parsing a wire response that omits the list defaults it to `[]`, and the published
JSON schema permits that omission. An omitted list never permits a redirect.
Entries are canonical HTTPS origins, including a non-default port when needed.
Paths (including a trailing slash), query strings, fragments, credentials,
wildcards, whitespace, and non-canonical spellings are rejected. Other hook
types cannot declare `redirectOrigins`. The platform also checks each returned
redirect against this allowlist; the result schema alone cannot do that check.
Go proto JSON omits an empty repeated list; the platform treats that wire
omission as an empty allowlist and rejects every redirect.

Use the public `OAuthFlowHookInputSchema` and `OAuthFlowHookResultSchema` on the
ordinary app handlers:

```ts
type OAuthFlowHookInput = {
  flowId: string;
  resumeUrl: string;
  expiresAt: string; // ISO 8601 datetime
};
type OAuthFlowHookResult =
  | { type: "continue" }
  | { type: "redirect"; url: string };
```

Input and result objects are strict. A continue result cannot include `url`, and
a redirect requires an absolute HTTPS URL without credentials. There is no
`settingsUrl` input or settings-specific redirect exception. Apps construct
their destinations from trusted configuration and signed context.

AppStore calls the same hook initially and after the original manager resumes
the flow. Recheck the actual external state and make repeated calls safe before
returning `continue`; browser query parameters and a redirect return are not
completion proof. These hooks run as the system caller, not the manager. Do not
turn the hook into an approval action by copying identity fields into a manager
context. The before hook receives no provider credential; the after hook receives
the exact newly connected credential in `context.authToken`. OAuth credentials
are stored and usable before the after hook finishes; a pending or cancelled
after step does not roll back OAuth.

`context.oauthFlow` is the platform-signed target: `appId`, `channelId`,
`managerId` (the initiating actor), `authScope` (`channel` or `manager`), optional
`key`, and optional `targetManagerId`. After authorization, `key` is the resolved
credential key. Use this context to select the target while keeping the caller
as system; these identity fields are not a manager authorization grant.

For user-approved setup, let the authenticated settings action commit its
business change and durable receipt. The after hook can read that receipt on
each retry. No app-to-platform completion callback is required. A compatible
AppStore deployment is required to execute these optional hooks.

## UserChat Open Lifecycle

`userChat.opened` uses only `actionFunctionName` and optional `systemVersion`;
it must not include a `targetId` or `webhook` configuration. AppStore delivers
the hook at least once to each exact active installation that registered it.

The handler receives a strict, immutable platform envelope:

```ts
interface UserChatOpenedHookInput {
  eventId: string;
  channelId: string;
  userChatId: string;
  state: "opened";
  previousState: string;
  openKind: "first_open" | "reopen";
  actorKind: "customer" | "manager" | "auto";
  triggerMessageId?: string;
  occurredAt: string; // ISO 8601 datetime
  version: string; // canonical non-negative signed-int64 decimal
}
```

The lifecycle envelope contains no customer or message snapshot. Read current
UserChat data through an authorized native function only after deciding that the
event is relevant, and tolerate that current data may have changed since
`occurredAt`. Treat `eventId`, the installation identity, and the handler
revision as the delivery idempotency boundary. A handler result uses
`hookHandlingResult`; `accepted` and `retrying` are non-terminal, while
`succeeded`, `skipped_reopen`, `skipped_ineligible_actor`, `skipped_disabled`,
`failed_retry_exhausted`, and `unknown` are terminal.

## TeamChat Message Created

`teamChat.messageCreated` declares an ordinary Function that receives an
immutable event after a TeamChat message is committed. It uses only
`actionFunctionName` and optional `systemVersion`; `targetId` and `webhook` are
not allowed.

```ts
interface TeamChatMessageCreatedHookInput {
  eventId: string;
  channelId: string;
  groupId: string;
  messageId: string;
  occurredAt: string; // ISO 8601 datetime
  sourceAppId?: string;
  snapshot: Record<string, unknown>; // full serialized Channel Message
}
```

The publisher emits every committed message in a public, non-archived TeamChat
group, including root messages, replies, and non-manager writers. Apps decide
which events are relevant to their own workflow. `snapshot` is the full Message
JSON produced by Channel, matching the existing UserChat message-created
delivery shape instead of a separately flattened subset. Read thread, writer,
plain text, links, files, reactions, and other message fields from the snapshot.
Message fields can grow as the platform evolves, so handlers must tolerate
unknown fields and must not treat the snapshot as a stable storage schema.
Identifiers in the envelope are non-empty strings of at most 255 characters.
Empty message content remains valid so a handler can return `skipped_empty` as a
terminal result.

All result states are terminal: `succeeded`, `skipped_source_app`,
`skipped_unlinked`, `skipped_ineligible_writer`, `skipped_empty`,
`skipped_oauth_unavailable`, `skipped_organization_mismatch`, and `unknown`.
Use `eventId` as the delivery idempotency boundary and `sourceAppId` as one
layer of loop prevention. A compatible AppStore and TeamChat publisher must be
deployed before this Hook is delivered.

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
lifecycle, widget installation, OAuth connection lifecycle, and app- or
manager-scoped public webhook registrations, plus the UserChat open and
TeamChat message-created lifecycle contracts.

## Good Fit

Use hooks for:

- app bootstrap and cleanup
- syncing external resources when the app is installed
- reacting to config save and delete lifecycle events
- reacting to command enable/disable
- provisioning resources when a specific widget is installed
- receiving external provider events without operating a separate webhook gateway

### Scope-specific OAuth hooks

The four OAuth hook types (`oauth.beforeAuthorization`, `oauth.afterAuthorization`,
`oauth.connected`, `oauth.disconnected`) accept optional `authScope: "channel" | "manager"`.
This is the concrete OAuth credential target, including when the OAuth configuration
uses `authScope: "caller"`; `caller` is not a valid hook scope.

```typescript
return {
  hooks: [
    { type: "oauth.connected", authScope: "channel", actionFunctionName: "hooks.channelConnected" },
    { type: "oauth.connected", authScope: "manager", actionFunctionName: "hooks.managerConnected" },
    { type: "oauth.disconnected", actionFunctionName: "hooks.sharedDisconnected" },
  ],
};
```

Register at most one hook per type and scope. For each event or authorization
phase, the matching scoped hook takes precedence over the shared hook with no
`authScope`. Only one hook runs. Without a matching scoped or shared registration,
the hook is skipped; the other scope's hook is never used. Existing registrations
without `authScope` retain their behavior. `targetId` remains forbidden on OAuth
hooks, and `redirectOrigins` remains exclusive to the two authorization hooks.
Deploy platform support before using scoped registrations.
