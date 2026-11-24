import { describe, expect, it } from "vitest";
import {
  CommerceSearchProductInputSchema,
  CommerceSearchProductOutputSchema,
} from "../../extensions/commerce.js";
import { getExtensionFunctionSchemas } from "../../extensions/function-schemas.js";

describe("Cafe24-compatible Standard product search", () => {
  it("keeps list mode, oversized page requests and opaque cursors for the search core", () => {
    expect(CommerceSearchProductInputSchema.parse({})).toEqual({});
    const request = {
      query: "",
      size: 1000,
      since: "opaque-page",
      searchFilter: { key: "productId", type: "string", operator: "$in", values: ["1001"] },
    };
    expect(CommerceSearchProductInputSchema.parse(request)).toEqual(request);
    expect(CommerceSearchProductInputSchema.parse({ searchFilter: null })).toEqual({
      searchFilter: null,
    });
    expect(CommerceSearchProductInputSchema.parse({ size: 0 })).toEqual({ size: 0 });
    expect(CommerceSearchProductInputSchema.parse({ size: -1 })).toEqual({ size: -1 });
  });

  it("preserves unrecognized filter keys so the core can reject them", () => {
    const filter = {
      key: "productId",
      type: "string",
      operator: "$eq",
      values: ["1001"],
      typo: true,
    };
    expect(CommerceSearchProductInputSchema.parse({ searchFilter: filter }).searchFilter).toEqual(
      filter
    );
  });

  it("preserves free products, sold-out quantities and an empty page with next", () => {
    const response = {
      products: [
        {
          id: "1001",
          name: "gift",
          amount: 0,
          retailAmount: 0,
          variants: [
            {
              variantId: "v1",
              amount: 0,
              quantity: 0,
              useInventory: false,
              options: [{ value: "red" }, {}],
            },
          ],
        },
      ],
      next: "opaque-page",
    };
    expect(CommerceSearchProductOutputSchema.parse(response)).toEqual(response);
    expect(CommerceSearchProductOutputSchema.parse({ products: [], next: "still-more" })).toEqual({
      products: [],
      next: "still-more",
    });
    const schema = getExtensionFunctionSchemas().find(
      (s) => s.name === "extension.commerce.product.searchProduct"
    );
    expect(schema).toBeDefined();
  });
});
