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

  it("accepts BCP 47 extension, private-use, and grandfathered tags", () => {
    expect(
      SuggestionTriggersSchema.parse({
        urls: [],
        keywords: {
          "en-US-u-ca-gregory": ["shopify"],
          "x-acme": ["shopify"],
          "i-klingon": ["shopify"],
          "en-GB-oed": ["shopify"],
          "sgn-BE-FR": ["shopify"],
        },
      })
    ).toEqual({
      urls: [],
      keywords: {
        "en-US-u-ca-gregory": ["shopify"],
        "x-acme": ["shopify"],
        "i-klingon": ["shopify"],
        "en-GB-oed": ["shopify"],
        "sgn-BE-FR": ["shopify"],
      },
    });
  });

  it("rejects malformed BCP 47 locale keys", () => {
    expect(() =>
      SuggestionTriggersSchema.parse({ urls: [], keywords: { "en-US-u": ["shopify"] } })
    ).toThrow();
    expect(() =>
      SuggestionTriggersSchema.parse({ urls: [], keywords: { x: ["shopify"] } })
    ).toThrow();
    expect(() =>
      SuggestionTriggersSchema.parse({ urls: [], keywords: { "i-unknown": ["shopify"] } })
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
  it("accepts and trims optional benefit text without changing omitted metadata", () => {
    expect(
      GetSuggestionTriggersOutputSchema.parse({ triggers, benefitText: { ko: " 알림을 받아요. " } })
    ).toEqual({ triggers, benefitText: { ko: "알림을 받아요." } });
    expect(GetSuggestionTriggersOutputSchema.parse({ triggers, benefitText: {} })).toEqual({
      triggers,
      benefitText: {},
    });
    expect(() =>
      GetSuggestionTriggersOutputSchema.parse({ triggers, benefitText: null })
    ).toThrow();
  });

  it("counts Unicode code points, including surrounding whitespace, for benefit text", () => {
    expect(() =>
      GetSuggestionTriggersOutputSchema.parse({ triggers, benefitText: { en: "😀".repeat(120) } })
    ).not.toThrow();
    for (const text of ["a".repeat(121), "😀".repeat(121), ` ${"a".repeat(120)}`]) {
      expect(() =>
        GetSuggestionTriggersOutputSchema.parse({ triggers, benefitText: { en: text } })
      ).toThrow();
    }
  });

  it.each([
    "",
    "   ",
    "\nhello",
    "hello\t",
    "hello\u0000",
    "hello\u2028world",
    "hello\u2029world",
    "<b>hello</b>",
    "[hello](url)",
    "`code`",
    "**bold**",
    "__bold__",
    "https://example.com",
    "WWW.example.com",
  ])("rejects invalid benefit text %j", (text) => {
    expect(() =>
      GetSuggestionTriggersOutputSchema.parse({ triggers, benefitText: { en: text } })
    ).toThrow();
  });

  it("validates benefit locale syntax and bounds the locale catalog", () => {
    expect(() =>
      GetSuggestionTriggersOutputSchema.parse({ triggers, benefitText: { "en-US-u": "hello" } })
    ).toThrow();
    const benefitText = Object.fromEntries(
      Array.from({ length: 20 }, (_, i) => [`x-${i}`, "hello"])
    );
    expect(() => GetSuggestionTriggersOutputSchema.parse({ triggers, benefitText })).not.toThrow();
    expect(() =>
      GetSuggestionTriggersOutputSchema.parse({
        triggers,
        benefitText: { ...benefitText, ko: "안녕하세요" },
      })
    ).toThrow();
  });

  it("serves static and async metadata through the registered function", async () => {
    const metadata = { triggers, benefitText: { en: "you can receive notifications." } };
    for (const provider of [metadata, async () => metadata, async () => triggers]) {
      const registered = registerExtension(createSuggestionExtensionV1(provider));
      await expect(
        registered.functions[0]?.handler(
          { caller: { id: "manager-1" }, channel: { id: "channel-1" }, app: { id: "app-1" } },
          {}
        )
      ).resolves.toEqual(
        typeof provider === "function" && !("triggers" in (await provider()))
          ? { triggers }
          : metadata
      );
    }
  });

  it("rejects invalid metadata returned by a provider", async () => {
    const registered = registerExtension(
      createSuggestionExtensionV1(async () => ({ triggers, benefitText: { en: "**bold**" } }))
    );
    await expect(
      registered.functions[0]?.handler(
        { caller: { id: "manager-1" }, channel: { id: "channel-1" }, app: { id: "app-1" } },
        {}
      )
    ).rejects.toThrow();
  });
  it.each([
    { en: "first benefit", " en ": "second benefit" },
    { " en ": "first benefit", en: "second benefit" },
  ])("rejects whitespace locale keys instead of silently losing metadata", async (benefitText) => {
    expect(() => GetSuggestionTriggersOutputSchema.parse({ triggers, benefitText })).toThrow();
    const registered = registerExtension(createSuggestionExtensionV1({ triggers, benefitText }));
    await expect(
      registered.functions[0]?.handler(
        { caller: { id: "manager-1" }, channel: { id: "channel-1" }, app: { id: "app-1" } },
        {}
      )
    ).rejects.toThrow();
  });
});
