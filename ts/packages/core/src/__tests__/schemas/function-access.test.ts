import { describe, expect, it } from "vitest";
import { z } from "zod";
import { createRegisteredFunction, FunctionAccessSchema } from "../../schemas/function.js";

describe("function access metadata", () => {
  it("preserves declared access without adding it to legacy functions", () => {
    const definition = { input: z.object({}), handler: () => ({}) };
    expect(createRegisteredFunction("legacy", definition)).not.toHaveProperty("access");
    const access = FunctionAccessSchema.parse({
      callerTypes: ["manager"],
      credentialScopes: ["manager"],
    });
    const registered = createRegisteredFunction("personal", { ...definition, access });
    expect(registered.access).toEqual(access);
    access.callerTypes.push("system");
    expect(registered.access?.callerTypes).toEqual(["manager"]);
  });
  it("rejects empty, unknown, or incomplete restrictions", () => {
    for (const access of [
      {},
      { callerTypes: ["manager"] },
      { callerTypes: [], credentialScopes: ["manager"] },
      { callerTypes: ["manager", "root"], credentialScopes: ["manager"] },
      { callerTypes: ["manager"], credentialScopes: ["caller"] },
    ]) {
      expect(FunctionAccessSchema.safeParse(access).success).toBe(false);
    }
  });
});
