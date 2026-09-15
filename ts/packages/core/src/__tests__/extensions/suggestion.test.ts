import { describe, expect, it } from "vitest";
import {
  createSuggestionExtensionV1,
  defineSuggestionTriggers,
  GetSuggestionTriggersOutputSchema,
  SuggestionFunctionNames,
  SuggestionTriggersSchema,
} from "../../extensions/index.js";
import { registerExtension } from "../../schemas/index.js";

const triggers = {
  urls: ["https://shopify.com/"],
  keywords: { ko: ["쇼피파이"], en: ["shopify"] },
};

describe("suggestion extension", () => {
  it("accepts URL and localized keyword triggers", () => {
    expect(defineSuggestionTriggers(triggers)).toEqual(triggers);
    expect(GetSuggestionTriggersOutputSchema.parse({ triggers })).toEqual({ triggers });
  });

  it("allows an empty snapshot to clear registered rules", () => {
    expect(SuggestionTriggersSchema.parse({ urls: [], keywords: {} })).toEqual({
      urls: [],
      keywords: {},
    });
  });

  it("rejects unsupported URL protocols and wildcard keywords", () => {
    expect(() =>
      SuggestionTriggersSchema.parse({ urls: ["ftp://shopify.com/"], keywords: {} })
    ).toThrow();
    expect(() =>
      SuggestionTriggersSchema.parse({
        urls: ["https://user:pass@shopify.com/"],
        keywords: {},
      })
    ).toThrow();
    expect(() =>
      SuggestionTriggersSchema.parse({ urls: [], keywords: { en: ["shop*"] } })
    ).toThrow();
  });

  it("accepts BCP 47 extension tags and rejects malformed locale keys", () => {
    expect(
      SuggestionTriggersSchema.parse({
        urls: [],
        keywords: { "en-US-u-ca-gregory": ["shopify"] },
      })
    ).toEqual({
      urls: [],
      keywords: { "en-US-u-ca-gregory": ["shopify"] },
    });
    expect(() =>
      SuggestionTriggersSchema.parse({ urls: [], keywords: { "en-US-u": ["shopify"] } })
    ).toThrow();
  });

  it("creates the single suggestion:v1 metadata function", async () => {
    const registered = registerExtension(createSuggestionExtensionV1(triggers));

    expect(registered.name).toBe("suggestion");
    expect(registered.systemVersion).toBe("v1");
    expect(registered.functions.map((fn) => fn.name)).toEqual(["metadata.getTriggers"]);
    await expect(
      registered.functions[0]?.handler(
        { caller: { id: "manager-1" }, channel: { id: "channel-1" }, app: { id: "app-1" } },
        {}
      )
    ).resolves.toEqual({ triggers });
  });

  it("exposes the extension-relative function name", () => {
    expect(SuggestionFunctionNames.getTriggers).toBe("metadata.getTriggers");
  });
});
