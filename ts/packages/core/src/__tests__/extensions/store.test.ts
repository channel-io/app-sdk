import { describe, expect, it } from "vitest";
import {
  createStoreExtension,
  defineStoreProfile,
  defineStoreProfileOutput,
  GetStoreProfileOutputSchema,
  StoreFunctionNames,
  StoreProfileMetadataSchema,
} from "../../extensions/index.js";
import { registerExtension } from "../../schemas/index.js";

const localizedContent = {
  images: [],
  intro: {
    helpsWith: "Connect order and shipping data to customer support.",
    recommendedFor: "Teams that automate repeated commerce questions.",
  },
  faqs: [{ question: "Do I need a commerce app?", answer: "It is optional." }],
};

const storeProfileMetadata = {
  relatedAppIds: ["appCafe24"],
  i18nMap: {
    ko: localizedContent,
    ja: localizedContent,
    en: localizedContent,
  },
};

describe("store extension schemas", () => {
  it("accepts persisted Store profile metadata without a profile envelope", () => {
    const parsed = GetStoreProfileOutputSchema.parse(storeProfileMetadata);

    expect(parsed.relatedAppIds).toEqual(["appCafe24"]);
    expect(parsed.i18nMap.en.intro.helpsWith).toContain("shipping");
  });

  it("rejects the legacy runtime profile shapes", () => {
    expect(() => GetStoreProfileOutputSchema.parse({ profile: storeProfileMetadata })).toThrow();
    expect(() =>
      StoreProfileMetadataSchema.parse({
        ...storeProfileMetadata,
        providerName: "Legacy provider",
      })
    ).toThrow();
  });

  it("accepts only the locales supplied by the app, including arbitrary Desk locales", () => {
    const parsed = StoreProfileMetadataSchema.parse({
      relatedAppIds: [],
      i18nMap: { fr: localizedContent, "zh-CN": localizedContent },
    });

    expect(Object.keys(parsed.i18nMap)).toEqual(["fr", "zh-CN"]);
    expect(parsed.i18nMap.fr.intro.helpsWith).toContain("shipping");
  });

  it("rejects blank or whitespace-padded locale keys", () => {
    for (const locale of ["", " fr", "fr "]) {
      expect(() =>
        StoreProfileMetadataSchema.parse({
          relatedAppIds: [],
          i18nMap: { [locale]: localizedContent },
        })
      ).toThrow();
    }
  });

  it("accepts empty extension values that allow Developer GUI fallbacks", () => {
    const emptyLocalizedContent = {
      images: [],
      intro: { helpsWith: "", recommendedFor: "   " },
      faqs: [],
    };

    const parsed = StoreProfileMetadataSchema.parse({
      relatedAppIds: [],
      i18nMap: {
        fr: emptyLocalizedContent,
      },
    });

    expect(parsed.relatedAppIds).toEqual([]);
    expect(parsed.i18nMap.fr.images).toEqual([]);
    expect(parsed.i18nMap.fr.intro.helpsWith).toBe("");
    expect(parsed.i18nMap.fr.intro.recommendedFor).toBe("   ");
  });

  it("treats uploaded relative media keys as opaque values", () => {
    const key = "app-store/app-id/detail-image/screenshot.webp";
    const parsed = StoreProfileMetadataSchema.parse({
      ...storeProfileMetadata,
      i18nMap: {
        ...storeProfileMetadata.i18nMap,
        ko: {
          ...localizedContent,
          images: [{ key, alt: "Acme Commerce setup" }],
        },
      },
    });

    expect(parsed.i18nMap.ko.images[0]?.key).toBe(key);
  });

  it("defines and validates static metadata", () => {
    expect(defineStoreProfile(storeProfileMetadata).relatedAppIds).toEqual(["appCafe24"]);
    expect(defineStoreProfileOutput(storeProfileMetadata).i18nMap.ko.faqs).toHaveLength(1);
  });

  it("creates a metadata extension that returns the persisted shape", async () => {
    const extension = createStoreExtension(storeProfileMetadata);
    const registered = registerExtension(extension);

    expect(registered.name).toBe("store");
    expect(registered.functions.map((fn) => fn.name)).toContain("metadata.getStoreProfile");

    const result = await registered.functions[0]?.handler(
      { caller: { id: "manager-1" }, channel: { id: "channel-1" }, app: { id: "app-1" } },
      {}
    );

    expect(result).toMatchObject({ relatedAppIds: ["appCafe24"] });
    expect(result).not.toHaveProperty("profile");
  });

  it("exposes extension-relative function names for decorator implementations", () => {
    expect(StoreFunctionNames.getStoreProfile).toBe("metadata.getStoreProfile");
  });
});
