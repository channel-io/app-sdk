# Suggestion Extension

Use `suggestion:v1` when an app can be recommended from a URL or localized keyword in a manager-written message. The Extension has one metadata Function. AppStore validates and snapshots the returned triggers during registration; the app is not called for each message.

## Contract

| Function | Requirement | Purpose |
| --- | --- | --- |
| `extension.suggestion.metadata.getTriggers` | Required | Declares URL and locale keyword triggers |

URL triggers must be absolute HTTP(S) URLs. Keyword triggers use BCP 47 locale keys and literal tokens or phrases; regex and wildcards are not supported. Return empty `urls` and `keywords` to remove all rules.

## TypeScript

~~~ts
import {
  Extension,
  Func,
  GetSuggestionTriggersInputSchema,
  GetSuggestionTriggersOutputSchema,
  InputSchema,
  OutputSchema,
  type SuggestionExtensionInterface,
} from "@channel.io/app-sdk-server";

@Extension({ name: "suggestion", systemVersion: "v1" })
export class SuggestionExtension implements SuggestionExtensionInterface {
  @Func("metadata.getTriggers")
  @InputSchema(GetSuggestionTriggersInputSchema)
  @OutputSchema(GetSuggestionTriggersOutputSchema)
  async getTriggers() {
    return {
      triggers: {
        urls: ["https://shopify.com/"],
        keywords: { ko: ["쇼피파이"], en: ["shopify"] },
      },
    };
  }
}
~~~

Lower-level consumers can use `createSuggestionExtensionV1` with a static trigger object or provider function.

## Lifecycle and privacy

AppStore calls `getTriggers` only during Extension registration or re-registration. It rejects the registration atomically if any rule is invalid and keeps the prior snapshot. Do not include credentials, customer data, channel IDs, or manager IDs in metadata.
