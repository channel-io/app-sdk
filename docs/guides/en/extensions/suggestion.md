# Suggestion Extension

Use Suggestion to let Channel recommend an uninstalled app when a manager writes a matching URL or localized keyword.

Implement the single `extension.suggestion.metadata.getTriggers` Function and register `suggestion:v1`. AppStore calls the Function during registration, validates the complete response, and stores an atomic trigger snapshot. It does not call the app while messages are being written.

~~~ts
@Extension({ name: "suggestion", systemVersion: "v1" })
class SuggestionExtension {
  @Func("metadata.getTriggers")
  @InputSchema(GetSuggestionTriggersInputSchema)
  @OutputSchema(GetSuggestionTriggersOutputSchema)
  getTriggers() {
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

- Use only absolute HTTP(S) URLs and literal keyword tokens or phrases.
- Do not use crawling, regex, wildcard rules, credentials, or user data.
- Return `{ triggers: { urls: [], keywords: {} } }` to remove every previously registered rule.
- Re-register after changing metadata and verify that the app appears in the suggestion catalog.

Go apps use `suggestion.Extension().GetTriggers(...)`; `suggestion.NewTriggers` and `suggestion.StaticTriggers` provide the static metadata path.

## Optional benefit text

`benefitText` is an optional BCP 47 locale-to-string map (up to 20 locales). Each value must contain 1–120 Unicode code points, including surrounding whitespace, and be nonblank single-line plain text. Links, HTML, Markdown delimiters (`<>[]`, backticks, `**`, `__`), control characters, and line separators are rejected. AppStore trims the text, canonicalizes locales, and rejects duplicate canonical locales. Omit the field or return `{}` to use the default recommendation; `null` is invalid.

Write only the benefit clause. The platform adds the app name, installation framing, and confirmation question. For Korean, it displays `{app} 앱을 설치하시면 {benefitText}` followed by `설치하시겠어요?`. AppStore selects the recipient's exact locale, then the base language. If neither translation exists, it keeps the default message. Benefit text appears only in the initial offer.

Re-register the Extension after changing benefit text. Use this field only with an AppStore version that supports it; older servers reject unknown fields. SDK support alone does not refresh registered metadata.

## Go

Use `suggestion.StaticMetadata` for a static response with benefit text, or return the same response from a custom `GetTriggers` handler. AppStore validates the metadata during registration; the Go helper serializes it without validating the benefit prose.

~~~go
triggers, err := suggestion.NewTriggers(nil, map[string][]string{"en": {"shopify"}})
if err != nil {
    return err
}
return suggestion.Extension().GetTriggers(suggestion.StaticMetadata(&suggestion.GetTriggersResponse{
    Triggers: triggers,
    BenefitText: map[string]string{
        "en": "you can view customer orders during conversations.",
    },
})).Register(app)
~~~

Existing `StaticTriggers` calls continue to work. An empty Go benefit map is omitted from the wire response, preserving compatibility for apps that do not opt in.
