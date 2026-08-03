import { describe, expect, it } from "vitest";
import { FunctionUserInputAnswersSchema, NeedsUserInputResultSchema } from "../index.js";

const validResult = {
  type: "needsUserInput" as const,
  requestId: "creatorDiscovery",
  questions: [
    {
      key: "platform",
      label: "Platform",
      prompt: "Which platform should be searched?",
      inputType: "singleSelect" as const,
      required: true,
      options: [
        { value: "youtube", label: "YouTube" },
        { value: "instagram", label: "Instagram" },
      ],
    },
    {
      key: "tiers",
      label: "Creator tiers",
      prompt: "Choose one or more creator tiers.",
      inputType: "multiSelect" as const,
      required: true,
      minSelections: 1,
      maxSelections: 2,
      options: [
        { value: "all", label: "All", exclusive: true },
        { value: "micro", label: "Micro" },
      ],
    },
  ],
  continuationToken: "opaque.signed.token",
};

describe("NeedsUserInputResultSchema", () => {
  it("accepts a bounded multi-question input request", () => {
    expect(NeedsUserInputResultSchema.parse(validResult)).toEqual(validResult);
  });

  it("rejects duplicate question keys and option values", () => {
    const duplicate = structuredClone(validResult);
    duplicate.questions[1]!.key = "platform";
    duplicate.questions[0]!.options[1]!.value = "youtube";

    const parsed = NeedsUserInputResultSchema.safeParse(duplicate);
    expect(parsed.success).toBe(false);
    if (parsed.success) return;

    expect(parsed.error.issues.map((issue) => issue.path.join("."))).toEqual(
      expect.arrayContaining(["questions.0.options.1.value", "questions.1.key"])
    );
  });

  it("rejects inverted input constraints", () => {
    const inverted = structuredClone(validResult);
    const tiers = inverted.questions[1]!;
    if (tiers.inputType !== "multiSelect") throw new Error("invalid fixture");
    tiers.minSelections = 3;
    tiers.maxSelections = 1;

    expect(NeedsUserInputResultSchema.safeParse(inverted).success).toBe(false);
  });

  it("rejects selection bounds larger than the option set", () => {
    const outOfRange = structuredClone(validResult);
    const tiers = outOfRange.questions[1]!;
    if (tiers.inputType !== "multiSelect") throw new Error("invalid fixture");
    tiers.maxSelections = tiers.options.length + 1;

    expect(NeedsUserInputResultSchema.safeParse(outOfRange).success).toBe(false);
  });
});

describe("FunctionUserInputAnswersSchema", () => {
  it("accepts only values supported by the shared question controls", () => {
    expect(
      FunctionUserInputAnswersSchema.parse({
        platform: "youtube",
        tiers: ["micro", "mid"],
        budget: 1000,
      })
    ).toEqual({
      platform: "youtube",
      tiers: ["micro", "mid"],
      budget: 1000,
    });
  });
});
