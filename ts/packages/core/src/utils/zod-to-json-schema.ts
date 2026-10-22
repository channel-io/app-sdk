import type { z } from "zod";
import { zodToJsonSchema as zodToJsonSchemaLib } from "zod-to-json-schema";
import { unicodeStringMaximum } from "./unicode-string.js";

/**
 * Convert Zod schema to JSON Schema
 */
export function zodToJsonSchema(schema: z.ZodType): Record<string, unknown> {
  return zodToJsonSchemaLib(schema, {
    $refStrategy: "none",
    postProcess: (jsonSchema, definition) => {
      const maximum = unicodeStringMaximum(definition);
      if (!jsonSchema || maximum === undefined) return jsonSchema;
      const bounded = { ...jsonSchema, maxLength: maximum };
      if ("pattern" in bounded && typeof bounded.pattern === "string") {
        // RegExp.source escapes these line separators. Literal characters also
        // work in JSON Schema validators whose regex engine does not accept \\u.
        bounded.pattern = bounded.pattern
          .replace(/\\u2028/g, "\u2028")
          .replace(/\\u2029/g, "\u2029");
      }
      return bounded;
    },
  });
}
