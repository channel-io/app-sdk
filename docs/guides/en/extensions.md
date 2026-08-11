# Extension Guide

## What an Extension is

An Extension is a named, versioned contract that connects typed app Functions to a standard
Channel capability. Channel surfaces know how to discover and invoke a command, widget, custom tab,
hook, OAuth flow, or other capability because the app implements that Extension's official Function
names and schemas.

An Extension normally contains two kinds of Functions:

| Function kind         | Purpose                                                  | Example                                  |
| --------------------- | -------------------------------------------------------- | ---------------------------------------- |
| Metadata or discovery | Describes the capability and points to runtime Functions | `extension.command.metadata.getCommands` |
| Runtime or action     | Performs the user-visible or background operation        | `extension.command.command.execute`      |

Metadata may reference a standalone app Function such as `orders.sync`. Keep app-specific business
operations standalone, and use the Extension namespace only for the standard contract. Inside an
Extension, a relative name becomes `extension.{extensionName}.{relativeName}`.

Registration does not upload or deploy app code. It announces the app-level
`(extensionName, systemVersion)` contract so AppStore can call the configured Function Endpoint and
discover schemas. It also does not install or enable the app in an individual Channel; installation,
permission grants, and capability activation are separate steps.

## From implementation to discovery

```text
SDK decorator or builder
  → Function schemas and Extension registration target
  → HTTPS server starts listening
  → SDK obtains a cached app token
  → registerExtension(appId, extensionName, systemVersion)
  → AppStore calls getFunctions and metadata Functions
  → installed Channel surfaces invoke runtime Functions
```

Use the SDK-owned Extension family, Function names, and schemas. A metadata response that points to
an action Function does not create that Function automatically; both the metadata Function and every
referenced runtime Function must be registered in the app server.

## TypeScript implementation and auto-registration

Use `@Extension` for the family and system version, `@Func` for relative names, and register the
decorated class as a NestJS provider. `ChannelAppModule` discovers the provider and performs the
recommended registration flow after the HTTP listener is ready.

```ts
import { Module } from "@nestjs/common";
import { z } from "zod";
import {
  ChannelAppModule,
  CommandResultSchema,
  Extension,
  Func,
  GetCommandsOutputSchema,
  InputSchema,
  OutputSchema,
} from "@channel.io/app-sdk-server";

@Extension({ name: "command", systemVersion: "v1" })
class CommandExtension {
  @Func("metadata.getCommands")
  @InputSchema(z.object({}))
  @OutputSchema(GetCommandsOutputSchema)
  getCommands() {
    return {
      commands: [
        {
          name: "hello",
          scope: "desk",
          actionFunctionName: "extension.command.command.open",
          alfMode: "disable",
          enabledByDefault: true,
        },
      ],
    };
  }

  @Func("command.open")
  @InputSchema(z.object({}).passthrough())
  @OutputSchema(CommandResultSchema)
  open() {
    return { type: "text", attributes: { message: "Hello" } };
  }
}

@Module({
  imports: [
    ChannelAppModule.forRoot({
      appId: process.env.APP_ID!,
      appSecret: process.env.APP_SECRET!,
      signingKey: process.env.SIGNING_KEY!,
      autoRegister: true,
    }),
  ],
  providers: [CommandExtension],
})
export class AppModule {}
```

If the class is missing from `providers`, discovery cannot see it. If `autoRegister` is false, the
SDK still dispatches implemented Functions, but it does not publish their Extension target to
AppStore.

## Go implementation and auto-registration

Use the typed `extension/{family}` builder with `app.Use`. The builder declares both the Function
schemas and the Extension target. `server.WithAutoRegister()` starts registration after the server
can answer discovery requests.

```go
app := appsdk.New(appsdk.Options{
  AppID:     os.Getenv("APP_ID"),
  AppSecret: os.Getenv("APP_SECRET"),
})

if err := app.Use(command.Extension().
  GetCommands(command.StaticCommands(&command.Config{
    Name:               "meeting",
    Scope:              command.ScopeDesk,
    ActionFunctionName: "commands.meeting.execute",
    AlfMode:            command.AlfModeDisable,
  })).
  Execute("commands.meeting.execute", executeMeeting),
); err != nil {
  log.Fatal(err)
}

if err := server.Run(
  app,
  server.WithSignature(os.Getenv("SIGNING_KEY")),
  server.WithAutoRegister(),
); err != nil {
  log.Fatal(err)
}
```

Use `server.WithAutoRegisterRetry` and `server.WithAutoRegisterResult` when deployment policy needs
custom retry or observability. Existing Gin servers use the equivalent options from `server/gin`.

## What `registerExtension` does

The recommended auto-registration flow:

1. waits until the Function server is listening;
2. gets one cached **app token** through `TokenManager`;
3. calls `registerExtension` for every discovered Extension name and system version;
4. retries transient failures with bounded exponential backoff;
5. lets AppStore call the versioned Function Endpoint for schema and metadata discovery.

The request fields are camelCase: `appId`, `extensionName`, and `systemVersion`. `systemVersion` such
as `v1` is the Channel Extension contract version, not the release version of your app.

Only custom bootstraps or deployment-controlled registration normally call the native Function
directly:

| SDK        | Explicit call                                                                                    |
| ---------- | ------------------------------------------------------------------------------------------------ |
| TypeScript | `nativeClient.registerExtension(appId, extensionName, systemVersion, appToken.accessToken)`      |
| Go         | `nativeClient.RegisterExtension(ctx, appToken.AccessToken, appID, extensionName, systemVersion)` |

Do not issue a new token or register on every Function request. Apps with only standalone Functions
use the SDK's `core:v1` fallback. A successful `registerExtension` call automatically synchronizes
ALF tasks and Notebooks; do not call a separate registration Function for either family. Messaging
and other advanced families may still require coordinated product setup or a family-specific
secondary sync, so follow their family recipe.

## Registration lifecycle and verification

- Deploy the Function Endpoint before registration because AppStore may call discovery immediately.
- Keep auto-registration enabled on normal startup and use its bounded retry instead of a custom
  infinite loop.
- In a multi-replica deployment, use shared token storage. Duplicate idempotent registration calls
  are acceptable, but every replica must not issue its own uncached token loop.
- Re-register after changing Extension schemas, metadata, Function names, permissions, or the
  Function Endpoint. Do not change `systemVersion` merely for an app release.
- Use `unregisterExtension` only when intentionally removing a capability; deployment rollback alone
  should restore the last compatible server and schemas.

Verify these boundaries separately:

1. startup logs show the expected Extension name, system version, and successful registration;
2. `getFunctions` discovery contains every metadata and referenced runtime Function;
3. metadata appears on the intended Channel surface after installation and activation;
4. one real runtime call succeeds in a test Channel;
5. invalid input, invalid signature, missing permission, and transient registration failure are
   rejected or retried as designed.

A successful `registerExtension` response proves only that the registration request was accepted.
It does not prove that discovery, metadata validation, Channel installation, activation, or runtime
handlers work.

## Choose an Extension family

For every Extension:

1. enable only the permissions used by its Functions;
2. implement metadata and referenced Functions with SDK schemas;
3. use SDK auto-registration with an app token;
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
asynchronously. Public `webhook.received` targets require a public `targetId`. App scope uses a
high-entropy `endpointToken`; manager scope receives an AppStore-issued URL in Function context.
Both require provider payload validation and replay protection.

[Hook recipe](extensions/hook.md)

## Polling

`extension.polling.metadata.getPollers` declares scheduled pollers. Scope-specific resolvers page
through channel targets (`target.getChannels`) or channel/manager targets (`target.getManagers`),
and each poller names a full Function to invoke. Store cursors durably, make retries idempotent,
bound each batch, and test partial failure.

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

`extension.alfTask.alftask.getTasks` publishes versioned automation tasks. Registering through
`registerExtension("alfTask", "v1")` also triggers task synchronization. Keep task keys stable, increment
versions for behavior changes, and verify the synchronized versions.

[ALF task recipe](extensions/alf-task.md)

## Notebook

`extension.notebook.core.getNotebooks` publishes versioned notebook definitions. Registering the
Notebook extension through `registerExtension` also triggers synchronization. Keep notebook and cell keys stable, increment versions for
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

After implementation passes, use the [production readiness guide](app-development.md) as the final
security, reliability, deployment, operations, and rollback gate.
