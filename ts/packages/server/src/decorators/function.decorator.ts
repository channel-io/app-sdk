import "reflect-metadata";
import { Injectable } from "@nestjs/common";

export const FUNCTION_METADATA = Symbol("FUNCTION_METADATA");
export const FUNCTIONS_METADATA = Symbol("FUNCTIONS_METADATA");

export interface FunctionOptions {
  /** Function name (e.g., "getAvailability" or "calendar.getAvailability") */
  name?: string;
  /** AppStore system contract version for a standalone function (default: "v1") */
  systemVersion?: string;
  /** Function description for documentation */
  description?: string;
  /** Whether this function is omitted from Function discovery */
  hidden?: boolean;
}

export interface FunctionMetadataValue {
  name: string;
  methodName: string | symbol;
  systemVersion?: string;
  description?: string;
  test?: boolean;
  hidden?: boolean;
}

/**
 * Marks a method as an extension function
 *
 * @example
 * ```typescript
 * @Extension("calendar")
 * export class CalendarExtension {
 *   @Func() // Uses method name: "getAvailability"
 *   async getAvailability(@Ctx() ctx, @Input() params) { ... }
 *
 *   @Func("booking.create") // Custom name
 *   async createBooking(@Ctx() ctx, @Input() params) { ... }
 *
 *   @Func({ name: "booking.cancel", description: "Cancel a booking" })
 *   async cancelBooking(@Ctx() ctx, @Input() params) { ... }
 * }
 * ```
 */
export function Func(nameOrOptions?: string | FunctionOptions): MethodDecorator {
  return createFunctionDecorator(nameOrOptions, false);
}

/**
 * Marks a method as a test-only extension function.
 *
 * Test functions are discoverable through
 * `extension.core.function.getTestFunctions`, but are intentionally hidden from
 * `extension.core.function.getFunctions`.
 *
 * @example
 * ```typescript
 * @Extension("calendar")
 * export class CalendarExtension {
 *   @TestFunc() // Uses test namespace: "test.createTestBooking"
 *   async createTestBooking(@Ctx() ctx, @Input() params) { ... }
 *
 *   @TestFunc("test.clearData") // Custom name
 *   async clearTestData(@Ctx() ctx, @Input() params) { ... }
 * }
 * ```
 */
export function TestFunc(nameOrOptions?: string | FunctionOptions): MethodDecorator {
  return createFunctionDecorator(nameOrOptions, true);
}

function createFunctionDecorator(
  nameOrOptions: string | FunctionOptions | undefined,
  test: boolean
): MethodDecorator {
  return (target, propertyKey, descriptor) => {
    const options: FunctionOptions =
      typeof nameOrOptions === "string" ? { name: nameOrOptions } : (nameOrOptions ?? {});

    // Use method name if no explicit name is provided.
    // Test-only functions live outside SDK extension interfaces, so default them
    // to the reserved test namespace instead of an extension namespace.
    const methodName = String(propertyKey);
    const functionName = options.name ?? (test ? `test.${methodName}` : methodName);

    const metadata: FunctionMetadataValue = {
      name: functionName,
      methodName: propertyKey,
    };

    if (options.systemVersion !== undefined) {
      const systemVersion = options.systemVersion.trim();
      if (systemVersion === "") {
        throw new Error("@Func systemVersion must be a non-empty string");
      }
      metadata.systemVersion = systemVersion;
    }

    if (test) {
      metadata.test = true;
    }

    if (options.hidden) {
      metadata.hidden = true;
    }

    if (options.description) {
      metadata.description = options.description;
    }

    // Store metadata on the method
    Reflect.defineMetadata(FUNCTION_METADATA, metadata, target.constructor, propertyKey);

    // Also maintain a list of all functions on the class
    const existingFunctionsMetadata: unknown = Reflect.getOwnMetadata(
      FUNCTIONS_METADATA,
      target.constructor
    );
    const existingFunctions = isFunctionKeyArray(existingFunctionsMetadata)
      ? [...existingFunctionsMetadata]
      : [];
    if (!existingFunctions.includes(propertyKey)) {
      existingFunctions.push(propertyKey);
    }
    Reflect.defineMetadata(FUNCTIONS_METADATA, existingFunctions, target.constructor);

    // Auto-apply @Injectable() to the class (idempotent)
    Injectable()(target.constructor);

    return descriptor;
  };
}

function isFunctionKeyArray(value: unknown): value is (string | symbol)[] {
  return (
    Array.isArray(value) &&
    value.every(
      (item): item is string | symbol => typeof item === "string" || typeof item === "symbol"
    )
  );
}
