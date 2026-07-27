# Messaging Extension

Use the `messaging` v1 Extension when an app connects an external messaging medium to Channel.
Messaging is an advanced integration: its app-level setup, channel permissions, runtime Functions,
and external-provider delivery must be designed as separate boundaries.

## TypeScript entry points

The SDK provides:

- `@Extension("messaging")` for Extension registration;
- `Messaging.inbox.*()` and `Messaging.prebuilt.*()` method decorators from
  `@channel.io/app-sdk-server`, bundling the correct relative Function name and Zod schemas;
- `MessagingFunctionNames`, DTO schemas, and interfaces from `@channel.io/app-sdk-core`;
- `createMessagingExtension()` for lower-level `ExtensionDefinition` consumers.

The runtime Function prefix is always `extension.messaging.*`. Payload fields use camelCase.

```ts
import {
  Extension,
  Messaging,
  type MessagingInboxExtensionInterface,
  type OnMediumMessageCreatedInput,
  type OnMediumMessageCreatedOutput,
  type Context,
} from "@channel.io/app-sdk-server";

@Extension({ name: "messaging", systemVersion: "v1" })
export class InboxMessagingExtension implements MessagingInboxExtensionInterface {
  @Messaging.inbox.onMediumMessageCreated()
  async onMediumMessageCreated(
    _ctx: Context,
    input: OnMediumMessageCreatedInput,
  ): Promise<OnMediumMessageCreatedOutput> {
    await deliverToProvider(input.userChat, input.message);
    return { sendResult: { sendState: "sent" } };
  }
}
```

List the decorated class in the NestJS module's `providers`. `ChannelAppModule` discovers its
Functions and `autoRegister` performs normal Extension registration.

## Function groups

Inbox Functions cover incoming/outgoing medium messages, chat closure, available writing types,
custom-editor WAMs, medium-topic selection, and provider error descriptions. Prebuilt Functions
cover writing types, entity validation, custom editors, topic building, and default options.

Implement only the optional Functions your enabled product flow requires. The inbox
`onMediumMessageCreated` handler is the core delivery Function and is required by
`MessagingInboxExtensionInterface`.

## Registration and permissions

Normal SDK auto-registration publishes the `messaging` Extension and its Function schemas.
Additional messaging product setup is coordinated through AppStore configuration and is not
automated by the SDK helper. Do not assume that registering the Extension grants channel-scoped
Native Function permissions.

Before implementation:

1. choose inbox, prebuilt, or both;
2. identify the Native Functions needed by that flow;
3. request only those app/channel permission scopes;
4. map provider identities to Channel users/chats without exposing provider secrets;
5. define delivery idempotency, retry, ordering, and close/reopen behavior.

Use a channel token and the typed `NativeFunctionClient` proxy for server-side Channel operations.
See [Native Functions](../NATIVE.md) and [authentication and tokens](../AUTH-AND-TOKENS.md).

## Reliability and security

- Deduplicate provider events before side effects.
- Make retries safe and preserve provider event ordering where required.
- Treat external IDs, message content, and contact data as sensitive.
- Keep access tokens and provider credentials server-side.
- Return stable Function error types without echoing message payloads or credentials.
- Validate WAM input and keep privileged writes on the server unless the current manager is the
  intended actor.

For a product-level task flow, start with the localized
[Extension guide](../../../guides/en/extensions/messaging.md). For exact DTO fields, use the
installed package types and schemas.
