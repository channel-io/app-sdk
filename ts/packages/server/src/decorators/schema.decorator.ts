import "reflect-metadata";
import type { z } from "zod";

export const INPUT_SCHEMA_METADATA = Symbol("INPUT_SCHEMA_METADATA");
export const OUTPUT_SCHEMA_METADATA = Symbol("OUTPUT_SCHEMA_METADATA");
export const DESCRIPTION_METADATA = Symbol("DESCRIPTION_METADATA");

/**
 * Define input schema for a function using Zod
 *
 * @example
 * ```typescript
 * const GetAvailabilityInput = z.object({
 *   startDate: z.string(),
 *   endDate: z.string(),
 * });
 *
 * @Function("getAvailability")
 * @InputSchema(GetAvailabilityInput)
 * async getAvailability(@Ctx() ctx, @Input() params) { ... }
 * ```
 */
export function InputSchema(schema: z.ZodType): MethodDecorator {
  return (target, propertyKey) => {
    Reflect.defineMetadata(INPUT_SCHEMA_METADATA, schema, target.constructor, propertyKey);
  };
}

/**
 * Define output schema for a function using Zod
 *
 * @example
 * ```typescript
 * const GetAvailabilityOutput = z.object({
 *   slots: z.array(TimeSlotSchema),
 * });
 *
 * @Function("getAvailability")
 * @OutputSchema(GetAvailabilityOutput)
 * async getAvailability(@Ctx() ctx, @Input() params) { ... }
 * ```
 */
export function OutputSchema(schema: z.ZodType): MethodDecorator {
  return (target, propertyKey) => {
    Reflect.defineMetadata(OUTPUT_SCHEMA_METADATA, schema, target.constructor, propertyKey);
  };
}

/**
 * Add description to a function
 *
 * @example
 * ```typescript
 * @Function("getAvailability")
 * @Description("Get available time slots for booking")
 * async getAvailability(@Ctx() ctx, @Input() params) { ... }
 * ```
 */
export function Description(text: string): MethodDecorator {
  return (target, propertyKey) => {
    Reflect.defineMetadata(DESCRIPTION_METADATA, text, target.constructor, propertyKey);
  };
}
