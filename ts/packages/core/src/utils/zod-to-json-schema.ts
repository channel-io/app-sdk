import { z } from "zod";

/**
 * Export the caller-facing input contract as inline JSON Schema Draft 7.
 * Transforms and defaults retain their accepted input shape. Unsupported JSON
 * types and recursive schemas fail registration rather than exporting `{}`.
 */
export function zodToJsonSchema(schema: z.ZodType): Record<string, unknown> {
  return z.toJSONSchema(schema, {
    target: "draft-7",
    io: "input",
    reused: "inline",
    cycles: "throw",
  });
}
