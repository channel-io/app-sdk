import { describe, expect, it } from "vitest";
import { CommerceGetAppConfigsOutputSchema } from "../../extensions/commerce.js";
import { FieldConfigSchema } from "../../extensions/order.js";

describe("capability field descriptions", () => {
  const field = {
    type: "enum",
    allowedValues: [{ value: "name", label: "Product name" }],
    description: "Choose the field to search",
  };

  it("preserves descriptions on enum fields", () => {
    expect(FieldConfigSchema.parse(field)).toEqual(field);
    expect(FieldConfigSchema.parse({ ...field, description: undefined })).toEqual({
      ...field,
      description: undefined,
    });
  });

  it("preserves descriptions in commerce capabilities", () => {
    const configs = {
      appCapabilities: {
        getProductsOptions: {
          fieldConfigs: { "searchFilter.key": field },
        },
      },
    };
    expect(CommerceGetAppConfigsOutputSchema.parse(configs)).toEqual(configs);
  });

  it("still requires enum choices and a string description", () => {
    expect(FieldConfigSchema.safeParse({ ...field, allowedValues: [] }).success).toBe(false);
    expect(FieldConfigSchema.safeParse({ ...field, description: 42 }).success).toBe(false);
    expect(FieldConfigSchema.parse({ type: "freeform", description: "Enter text" })).toEqual({
      type: "freeform",
      description: "Enter text",
    });
  });
});
