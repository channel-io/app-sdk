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
      benefitText: {
        ko: "고객의 주문 정보를 상담 중에 확인할 수 있어요.",
        en: "you can view customer orders during conversations.",
      },
    };
  }
}
~~~

Lower-level consumers can use `createSuggestionExtensionV1` with a static trigger object or provider function. To supply benefit text, pass a complete metadata response (or a provider returning it):

~~~ts
createSuggestionExtensionV1({
  triggers: { urls: [], keywords: { en: ["shopify"] } },
  benefitText: { en: "you can view customer orders during conversations." },
});
~~~

The helper validates metadata before returning it. AppStore remains responsible for canonical locale validation.

## Lifecycle and privacy

AppStore calls `getTriggers` only during Extension registration or re-registration. It rejects the registration atomically if any rule is invalid and keeps the prior snapshot. Do not include credentials, customer data, channel IDs, or manager IDs in metadata.

## Optional benefit text

`benefitText` is an optional BCP 47 locale-to-string map (up to 20 locales). Each value must contain 1–120 Unicode code points, including surrounding whitespace, and be nonblank single-line plain text. Links, HTML, Markdown delimiters (`<>[]`, backticks, `**`, `__`), control characters, and line separators are rejected. AppStore trims the text, canonicalizes locales, and rejects duplicate canonical locales. Omit the field or return `{}` to use the default recommendation; `null` is invalid.

Write only the benefit clause. The platform adds the app name, installation framing, and confirmation question. For Korean, it displays `{app} 앱을 설치하시면 {benefitText}` followed by `설치하시겠어요?`. AppStore selects the recipient's exact locale, then the base language. If neither translation exists, it keeps the default message. Benefit text appears only in the initial offer.

Re-register the Extension after changing benefit text. Use this field only with an AppStore version that supports it; older servers reject unknown fields. SDK support alone does not refresh registered metadata.
