import type { CommerceSearchProductOutput } from "../../extensions/commerce.js";

// Numeric fields must remain usable through the public Proto-backed type.
const output: CommerceSearchProductOutput = {
  products: [
    {
      id: "1001",
      name: "gift",
      createdAt: 1795400000123,
      updatedAt: 1795400000123,
      defaultImage: {
        bucket: "",
        key: "",
        id: "",
        type: "",
        name: "",
        size: 0,
        width: 0,
        height: 0,
      },
      variants: [{ options: [{ value: "red" }, {}] }],
    },
  ],
};
void output;
