import { z } from "zod";

const maxima = new WeakMap<z.ZodTypeDef, number>();

/** JSON Schema maxLength counts Unicode code points, while Zod 3 counts UTF-16 units. */
export function maxCodePoints(schema: z.ZodString, maximum: number) {
  const bounded = schema.refine((value) => {
    let count = 0;
    for (const _point of value) if (++count > maximum) return false;
    return true;
  }, `String must contain at most ${maximum} Unicode code points`);
  maxima.set(bounded._def, maximum);
  return bounded;
}

export function unicodeStringMaximum(definition: z.ZodTypeDef): number | undefined {
  return maxima.get(definition);
}
