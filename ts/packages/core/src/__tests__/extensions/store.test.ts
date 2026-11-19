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

  it("accepts optional search terms and rejects blank or non-array values", () => {
    expect(defineStoreProfile(storeProfileMetadata).searchKeyword).toBeUndefined();
    expect(
      defineStoreProfile({ ...storeProfileMetadata, searchKeyword: [] }).searchKeyword
    ).toEqual([]);
    expect(
      defineStoreProfile({ ...storeProfileMetadata, searchKeyword: [" Slack ", "슬랙", "Slack"] })
        .searchKeyword
    ).toEqual(["Slack", "슬랙"]);
    for (const searchKeyword of ["Slack", ["  "], [1]]) {
      expect(() =>
        StoreProfileMetadataSchema.parse({ ...storeProfileMetadata, searchKeyword })
      ).toThrow();
    }
  });

  it("registers search metadata through the store function", async () => {
    const registered = registerExtension(
      createStoreExtension({ ...storeProfileMetadata, searchKeyword: ["Slack", "슬랙"] })
    );
    const result = await registered.functions[0]?.handler(
      { caller: { id: "manager-1" }, channel: { id: "channel-1" }, app: { id: "app-1" } },
      {}
    );
    expect(result).toMatchObject({ searchKeyword: ["Slack", "슬랙"] });
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

  it("requires all supported locales", () => {
    expect(() =>
      StoreProfileMetadataSchema.parse({
        relatedAppIds: [],
        i18nMap: { ko: localizedContent, en: localizedContent },
      })
    ).toThrow();
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
