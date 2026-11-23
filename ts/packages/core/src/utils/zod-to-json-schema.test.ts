import { describe, expect, it } from "vitest";
import { z } from "zod";
import { zodToJsonSchema } from "./zod-to-json-schema.js";

describe("Zod 4 registration schemas", () => {
  it("exports the input of a transform and the optional input of a default", () => {
    const schema = zodToJsonSchema(
      z.object({ value: z.string().transform(Number), label: z.string().default("default") })
    );
    expect(schema).toMatchObject({
      $schema: "http://json-schema.org/draft-07/schema#",
      properties: { value: { type: "string" }, label: { type: "string", default: "default" } },
      required: ["value"],
    });
  });

  it("keeps strict objects, key restrictions and collection bounds", () => {
    const schema = zodToJsonSchema(
      z.object({ labels: z.record(z.string().regex(/^[a-z]+$/), z.string()).optional() }).strict()
    );
    expect(schema).toMatchObject({
      additionalProperties: false,
      properties: {
        labels: {
          type: "object",
          propertyNames: { type: "string", pattern: "^[a-z]+$" },
          additionalProperties: { type: "string" },
        },
      },
    });
    expect(zodToJsonSchema(z.array(z.string()).max(2))).toMatchObject({ maxItems: 2 });
  });

  it("inlines reused schemas without definitions or references", () => {
    const item = z.object({ id: z.string() });
    const schema = zodToJsonSchema(z.object({ first: item, second: item }));
    expect(schema).toMatchObject({
      properties: {
        first: { type: "object", properties: { id: { type: "string" } } },
        second: { type: "object", properties: { id: { type: "string" } } },
      },
    });
    expect(JSON.stringify(schema)).not.toMatch(/"\$(?:ref|defs)"/);
  });

  it("rejects recursive and non-JSON contracts instead of silently publishing any", () => {
    const recursive: z.ZodType = z.lazy(() => z.object({ next: recursive.optional() }));
    expect(() => zodToJsonSchema(recursive)).toThrow();
    for (const schema of [z.date(), z.bigint(), z.symbol()]) {
      expect(() => zodToJsonSchema(schema)).toThrow();
    }
  });

  it("rejects an oversized array before parsing its elements", () => {
    let parsed = 0;
    const item = z.string().transform((value) => {
      parsed++;
      return value;
    });
    expect(z.array(item).max(1).safeParse(["a", "b"]).success).toBe(false);
    expect(parsed).toBe(0);
    expect(z.array(item).max(1).parse(["a"])).toEqual(["a"]);
    expect(parsed).toBe(1);
  });
});
