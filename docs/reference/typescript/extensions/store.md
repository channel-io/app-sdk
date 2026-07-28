# Store Extension

Use the Store Extension to provide localized App Store introduction metadata without hardcoding app-specific copy in App Store.

App Store calls the metadata function during registration or re-registration, validates the result, and persists it as the `extension` source. App Store combines it with any Developer GUI fallback when serving list and detail queries; it does not call the app function for every customer-facing read.

## Required Function

- `extension.store.metadata.getStoreProfile`

Register the extension through `registerExtension("store", "v1")`.

## Output Contract

The function returns the persisted metadata directly. Do not wrap it in a `profile` field.

```typescript
type StoreProfileMetadata = {
  relatedAppIds: string[];
  i18nMap: Record<string, StoreProfileLocalizedContent>;
};

type StoreProfileLocalizedContent = {
  images: Array<{ key: string; alt?: string }>;
  intro: {
    helpsWith: string;
    recommendedFor: string;
  };
  faqs: Array<{ question: string; answer: string }>;
};
```

- `relatedAppIds` lists apps that work with this app.
- `i18nMap` accepts every non-empty locale code exposed by Desk. Add only locales that have authored content; `ko`, `ja`, and `en` are not pre-created or required.
- `images[].key` is the opaque relative key returned by the App Store media upload API. Do not assume a storage prefix or pass an external URL.
- `images[].alt` is limited to 120 characters.
- Intro and FAQ answers support the limited Markdown syntax validated by App Store.
- The SDK output always represents the `extension` source. It never contains Developer GUI values or source wrappers.
- Use empty image/related-app arrays or whitespace-only/empty intro strings when App Store Developer GUI should provide a fallback value. App Store evaluates those fields per locale/field.
- FAQs are additive rather than fallback-only: App Store shows extension FAQs first and appends Developer GUI FAQs. Extension FAQs remain read-only in the Developer GUI, while developers can add, edit, or remove GUI FAQs.

## TypeScript Implementation

Current NestJS apps should implement the metadata Function with decorators. The lower-level `createStoreExtension()` export builds an `ExtensionDefinition`, but `ChannelAppModule` does not consume that definition directly.

```typescript
import {
  Extension,
  Func,
  OutputSchema,
  StoreFunctionNames,
  GetStoreProfileOutputSchema,
  type StoreExtensionInterface,
} from "@channel.io/app-sdk-server";

@Extension({ name: "store", systemVersion: "v1" })
export class MyStoreExtension implements StoreExtensionInterface {
  @Func(StoreFunctionNames.getStoreProfile)
  @OutputSchema(GetStoreProfileOutputSchema)
  async getStoreProfile() {
    const localizedContent = {
      images: [],
      intro: {
        helpsWith: "Connect customer work to Channel Talk.",
        recommendedFor: "Teams that automate repeated customer questions.",
      },
      faqs: [],
    };

    return {
      relatedAppIds: [],
      i18nMap: {
        ko: localizedContent,
      },
    };
  }
}
```
