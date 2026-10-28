import { describe, expect, it } from "vitest";
import { CommerceGetProductsOutputSchema } from "../../extensions/commerce.js";

describe("commerce product stock presence", () => {
  it("keeps product stock distinct from absent and variant stock in canonical output", () => {
    const result = CommerceGetProductsOutputSchema.parse({
      products: [
        { id: "zero", name: "sold out", stockQuantity: 0 },
        { id: "unknown", name: "unknown" },
        {
          id: "optioned",
          name: "optioned",
          stockQuantity: 2,
          variants: [{ id: "v", price: 0, stockQuantity: 1 }],
        },
      ],
    });
    expect(result.products?.[0]?.stockQuantity).toBe(0);
    expect(result.products?.[1]).not.toHaveProperty("stockQuantity");
    expect(result.products?.[2]).toMatchObject({
      stockQuantity: 2,
      variants: [{ stockQuantity: 1 }],
    });
  });

  it.each([-1, Infinity, NaN])("rejects invalid whole-product inventory: %s", (stockQuantity) => {
    expect(() =>
      CommerceGetProductsOutputSchema.parse({ products: [{ id: "p", name: "p", stockQuantity }] })
    ).toThrow();
  });
});
