# TypeScript Extensions

An extension is a named, versioned function surface registered with AppStore. Current TypeScript apps should implement extensions with the decorators exported by `@channel.io/app-sdk-server`.

## Function names

Inside an extension, a relative function such as `metadata.getCommands` becomes:

```text
extension.{extensionName}.metadata.getCommands
```

Plain app functions referenced by metadata may use names such as `tutorial.open` or `orders.sync`.

## Minimal command extension

```ts
import { z } from "zod";
import {
  Extension,
  Func,
  InputSchema,
  OutputSchema,
  GetCommandsOutputSchema,
  CommandResultSchema,
} from "@channel.io/app-sdk-server";

@Extension({ name: "command", systemVersion: "v1" })
export class CommandExtension {
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
```

Register decorated classes as NestJS providers:

```ts
@Module({
  imports: [
    ChannelAppModule.forRoot({
      appId: process.env.APP_ID!,
      appSecret: process.env.APP_SECRET!,
      autoRegister: true,
    }),
  ],
  providers: [CommandExtension],
})
export class AppModule {}
```

Auto-registration issues an app token through the shared `TokenManager`, calls `registerExtension`, and lets AppStore discover metadata and function schemas through the versioned Function Endpoint.

## Canonical schema registry

Prefer a named family schema such as `GetCommandsOutputSchema` when the SDK exports one. Some
families expose typed interfaces and DTO/entity schemas without a named Zod schema for every
Function input and output. In that case, use the public canonical registry rather than rebuilding
the wire schema from memory:

```ts
import { extensionFunctionSchemaDefinitions } from "@channel.io/app-sdk-server";

function canonicalSchema(name: string) {
  const definition = extensionFunctionSchemaDefinitions.find((item) => item.name === name);
  if (!definition) throw new Error(`Unknown canonical Extension Function: ${name}`);
  return definition;
}

const listCalendarsSchema = canonicalSchema(
  "extension.calendar.calendar.listCalendars",
);

@Func("calendar.listCalendars")
@InputSchema(listCalendarsSchema.input)
@OutputSchema(listCalendarsSchema.output)
async listCalendars(@Ctx() ctx: Context, @Input() input: ListCalendarsInput) {
  return this.provider.listCalendars(ctx, input);
}
```

The lookup name is always the full canonical name even though `@Func` inside `@Extension` receives
the relative name. Fail at startup when the lookup is missing. Never replace an SDK-owned schema
with a looser shape merely to make discovery pass.

## Extension guide index

| Extension        | Metadata/function guide                                   |
| ---------------- | --------------------------------------------------------- |
| Command          | [command.md](extensions/command.md)                       |
| Config           | [config.md](extensions/config.md)                         |
| OAuth            | [oauth.md](extensions/oauth.md)                           |
| Calendar         | [calendar.md](extensions/calendar.md)                     |
| Widget           | [widget.md](extensions/widget.md)                         |
| Custom tab       | [customtab.md](extensions/customtab.md)                   |
| Hook             | [hook.md](extensions/hook.md)                             |
| Polling          | [polling.md](extensions/polling.md)                       |
| Store            | [store.md](extensions/store.md)                           |
| DataSource       | [datasource.md](extensions/datasource.md)                 |
| Commerce         | [Commerce recipe](../../guides/en/extensions/commerce.md) |
| WMS              | [WMS recipe](../../guides/en/extensions/wms.md)           |
| Messaging        | [messaging.md](extensions/messaging.md)                   |
| ALF task         | [alf-task.md](extensions/alf-task.md)                     |
| Notebook         | [notebook.md](extensions/notebook.md)                     |
| Mail relay       | [mail-relay.md](extensions/mail-relay.md)                 |

## Choosing an API

- Use decorators for known extension families and NestJS dependency injection.
- Use standalone decorator providers for small app/core Functions.
- Use public extension schemas as `@InputSchema` and `@OutputSchema` values.
- Use `NativeFunctionClient` only for AppStore/Channel operations, not to replace incoming function routing.
- Use `@channel.io/app-sdk-wam` for frontend runtime calls.
