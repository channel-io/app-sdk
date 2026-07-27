# TypeScript SDK Architecture

## Packages

| Package                      | Responsibility                                                                                  |
| ---------------------------- | ----------------------------------------------------------------------------------------------- |
| `@channel.io/app-sdk-core`   | Context types, extension contracts, Zod schemas, generated protocol types                       |
| `@channel.io/app-sdk-server` | NestJS integration, decorators, discovery, routing, tokens, native clients, signatures, testing |
| `@channel.io/app-sdk-wam`    | React provider and hooks for the WAM runtime                                                    |
| `@channel.io/app-sdk-wam-ui` | Optional Channel-consistent WAM UI components                                                   |
| `@channel.io/app-sdk`        | CLI entry point                                                                                 |

## Request lifecycle

```text
Channel client
  -> AppStore
  -> PUT {Function Endpoint}/{systemVersion}
  -> signature guard
  -> ChannelAppController
  -> ExtensionDiscoveryService
  -> decorated handler
  -> result/error
  -> AppStore
  -> Channel client
```

The default controller route is `PUT /functions/:version`. The developer portal stores the
`/functions` root. Versioned discovery appends the system version. Callers without a system version
can invoke the bare root, so a standalone ingress must rewrite only bare `PUT /functions` to the
default `/functions/v1` route while preserving the raw body. Reuse the same SDK controller and
signature guard; do not add an unsigned second dispatcher. A hosting platform may provide this
mapping; otherwise configure it in the app's ingress.

## Extension discovery

Place decorated classes in a NestJS module's `providers`:

```ts
@Extension({ name: "calendar", systemVersion: "v1" })
export class CalendarExtension {
  @Func("calendar.listCalendars")
  @InputSchema(ListCalendarsInputSchema)
  @OutputSchema(ListCalendarsOutputSchema)
  listCalendars(@Ctx() ctx: Context, @Input() input: ListCalendarsInput) {
    return this.calendarService.list(ctx.channel.id, input);
  }
}
```

`ExtensionDiscoveryService` reads decorator metadata, creates full names, generates the function catalog, and dispatches incoming calls. Extension classes remain normal NestJS providers and can use dependency injection.

## Bootstrap and registration

```ts
const options = {
  appId: process.env.APP_ID!,
  appSecret: process.env.APP_SECRET!,
  signingKey: process.env.SIGNING_KEY!,
  autoRegister: true,
};

@Module({
  imports: [ChannelAppModule.forRoot(options)],
  providers: [CalendarExtension],
})
export class AppModule {}
```

After the HTTP server starts listening, auto-registration:

1. Gets a cached app token from `TokenManager`.
2. Calls `registerExtension` for each discovered extension name/system version.
3. Retries transient failures with exponential backoff.
4. Lets AppStore call the versioned endpoint to read function/metadata schemas.

When no extension decorator exists, auto-registration uses the `core` extension fallback for standalone functions.

## Authentication boundaries

- `App Secret` is used only for token exchange.
- `TokenManager` owns app/channel token caching, refresh, and concurrent request deduplication.
- `NativeFunctionClient` transports native and app-function calls with an access token supplied by the caller.
- `SignatureGuard` verifies incoming `x-signature` against the raw request body and hex Signing Key.
- WAM manager/user authorization belongs to the Channel runtime, not the server token manager.

For multiple server replicas, provide a shared `TokenCacheStorage`.

## Signature setup

```ts
const app = await NestFactory.create(AppModule, { rawBody: true });
```

```ts
@Module({
  providers: [
    { provide: APP_GUARD, useFactory: () => new SignatureGuard(options) },
  ],
})
export class AppModule {}
```

Never verify a re-serialized object; whitespace and property order change the signed bytes.

## WAM boundary

The server returns an action like:

```ts
{
  type: "wam",
  attributes: {
    appId: process.env.APP_ID,
    name: "booking",
    wamArgs: { bookingId: "..." },
  },
}
```

AppStore/Channel loads `${WAM_ENDPOINT}/booking`. The React app uses `WamProvider`, `useWamData`, `useCallFunction`, `useNativeFunction`, `useWamSize`, and `useWamClose`.

Keep secrets out of `wamArgs`; the WAM is client-side code.

## DataSource boundary

DataSource metadata is exposed through extension functions. Query execution is a separate gRPC service under `datasource/grpc`. Do not route query streams through the JSON Function Endpoint.

## Source of truth

Use this order when examples disagree:

1. Public package exports.
2. Core extension schemas and interfaces.
3. Server discovery/router/token source.
4. Reference documents and current examples.
