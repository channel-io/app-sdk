# Extension Guide

An Extension connects typed app Functions to a standard Channel capability. Choose an official
Extension before writing handlers, reuse the SDK schemas and names, and keep app-specific business
Functions standalone. Registration and runtime execution are separate: a successful
`registerExtension` call does not prove that metadata discovery or handlers work.

For every Extension:

1. enable only the permissions used by its Functions;
2. implement metadata and referenced Functions with SDK schemas;
3. register the Extension once with an app token;
4. test discovery, valid calls, invalid input, missing authorization, and retries;
5. keep App Secret, Signing Key, app/channel tokens, and provider credentials out of WAM code.

TypeScript apps normally use `@Extension` and `@Func`. Go apps should prefer the typed
`extension/{family}` builder. Each family recipe below covers both languages, authentication, WAM,
reliability, and testing, then links the exact TypeScript schemas and
[Go Extension reference](../../reference/go/EXTENSIONS.md).

Read [Function registration](functions.md) for the shared wire contract and apply the
[WAM guide](wam.md) to any Extension that opens UI.

## Config

Use `config` for API keys, `client_credentials`, shop identifiers, and other scoped settings.
Implement `extension.config.metadata.getConfigSchema`. Optional validation, save, and delete
Functions may enforce provider rules. Mark secrets as credentials, localize labels rather than
stable keys, and read injected values from Function context instead of sending them to a WAM.

[Config recipe](extensions/config.md)

## OAuth

Use `oauth` only for a provider's Authorization Code flow. Implement
`extension.oauth.metadata.getAuthConfig` and register `oauth:v1`. AppStore owns redirect state and
injects the connected provider token as `ctx.authToken`. Do not use this Extension for API keys or
`client_credentials`; those belong in Config.

[OAuth recipe](extensions/oauth.md)

## Command

`extension.command.metadata.getCommands` publishes Desk commands. Each command must reference the
exact full name of a standalone or Extension Function. Use a command to return text, perform an
action, or open a WAM. Test command discovery separately from the referenced action handler.

[Command recipe](extensions/command.md) · [WAM guide](wam.md) ·
[TypeScript tutorial](https://github.com/channel-io/app-tutorial-ts) ·
[Go tutorial](https://github.com/channel-io/app-tutorial)

## Widget

`extension.widget.metadata.getWidgets` publishes contextual widgets. Widget metadata selects the
surface and action Function; the action can return a WAM. Treat chat, user, and manager fields as
surface-dependent optional context and verify permissions for every native action.

[Widget recipe](extensions/widget.md)

## Custom tab

`extension.customtab.metadata.getCustomTabs` publishes app-owned tabs. Keep tab identifiers stable,
point actions to exact Function names, and use a WAM for interactive content. Do not place tokens or
private records in tab metadata or `wamArgs`.

[Custom tab recipe](extensions/customtab.md)

## Hook

`extension.hook.metadata.getHooks` declares event-driven Functions. Make handlers idempotent,
authenticate signed app Function calls, and return quickly when the event can be processed
asynchronously. Public `webhook.received` targets require a public `targetId`, a high-entropy
`endpointToken`, payload validation, replay protection, and secret rotation.

[Hook recipe](extensions/hook.md)

## Polling

`extension.polling.metadata.getPollers` declares scheduled pollers. A target resolver such as
`target.getChannels` pages through installed channels, and each poller names a full Function to
invoke. Store cursors durably, make retries idempotent, bound each batch, and test partial failure.

[Polling recipe](extensions/polling.md)

## Calendar

Use `calendar` for calendars, event types, availability, booking creation, cancellation, and
queries. Keep provider credentials server-side, normalize time zones explicitly, and make booking
mutations idempotent. A WAM is appropriate for slot selection while server Functions own provider
calls.

[Calendar recipe](extensions/calendar.md)

## Store

`extension.store.metadata.getStoreProfile` publishes store identity and presentation metadata.
AppStore reads the profile during registration or synchronization. Keep stable IDs separate from
localized labels and do not include provider credentials in the profile.

[Store recipe](extensions/store.md)

## DataSource

DataSource metadata exposes catalogs, tables, columns, and table descriptions. Query execution uses
the authenticated DataSource gRPC endpoint rather than the normal app Function route. Validate
`x-access-token`, enforce catalog/table allowlists, parameterize SQL, cap rows and time, and stream
Arrow-compatible results. The SDK includes PostgreSQL and BigQuery-oriented runners.

[DataSource recipe](extensions/datasource.md) ·
[Go examples](../../reference/go/EXTENSIONS.md#datasource-extension-and-query-server)

## Commerce

Use the redesigned `commerce` Extension for new commerce apps. It provides the ID-based order model,
buyer information, order lookup, cancel/return/exchange requests, exchangeable items, shipping
address changes, and structured `ActionResult` responses. Validate provider state before mutations
and return explicit unsupported results when a provider lacks an operation.

[Commerce details](extensions/commerce.md)

## WMS

`wms` connects warehouse/order-management providers. Use the ID-based
`extension.wms.order.*` Functions for order lookup, cancel/return/exchange restore flows, and
shipping-address changes. Require explicit shop configuration and test reversible mutations in a
safe environment.

[WMS details](extensions/wms.md)

## Messaging

Messaging covers inbox, prebuilt messaging, follow-up, medium-link, and CHX integrations. It is
more AppStore-driven than other families and still uses generic registration plus several
channel-scoped native Functions. Design the required native claims first, persist external
conversation/message mappings, make webhook or polling delivery idempotent, and never impersonate a
user without the proper user/manager authorization.

[Messaging recipe](extensions/messaging.md)

## ALF task

`extension.alfTask.alftask.getTasks` publishes versioned automation tasks. Registration has two
steps: `registerExtension("alfTask", "v1")` and `registerAlfTasks`. Keep task keys stable, increment
versions for behavior changes, and verify the synchronized versions.

[ALF task recipe](extensions/alf-task.md)

## Notebook

`extension.notebook.core.getNotebooks` publishes versioned notebook definitions. Registration also
requires `registerAppNotebooks`. Keep notebook and cell keys stable, increment versions for
definition changes, and treat rendered content as untrusted when it includes external data.

[Notebook recipe](extensions/notebook.md)

## Mail relay

`mailRelay` receives normalized mail events through
`extension.mailRelay.inbound.onMailReceived`. TypeScript `0.17.2` registers that full Function name
as a standalone `@Func` and calls `registerExtension("mailRelay", "v1")` explicitly; Go provides a
typed builder. Validate relay tokens, bound attachments and body size, deduplicate message IDs, and
avoid logging raw mail content.

[Mail relay recipe](extensions/mail-relay.md)

## Verification checklist

- Metadata uses the exact SDK schema and full Function names.
- The Extension class/provider or Go builder is registered once.
- Function requests reject missing or invalid signatures.
- App/channel tokens are cached and refreshed; manager/user authorization remains in the WAM host.
- Provider credentials are injected from Config/OAuth and never returned to the client.
- Mutations are idempotent or safely retryable and have explicit permission-failure behavior.
- Discovery and at least one real invocation pass in an installed test app.
