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
    };
  }
}
~~~

- Use only absolute HTTP(S) URLs and literal keyword tokens or phrases.
- Do not use crawling, regex, wildcard rules, credentials, or user data.
- Return `{ triggers: { urls: [], keywords: {} } }` to remove every previously registered rule.
- Re-register after changing metadata and verify that the app appears in the suggestion catalog.

Go apps use `suggestion.Extension().GetTriggers(...)`; `suggestion.NewTriggers` and `suggestion.StaticTriggers` provide the static metadata path.
