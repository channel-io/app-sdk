import "reflect-metadata";
import type { Type } from "@nestjs/common";
import type { z } from "zod";
import {
  EXTENSION_METADATA,
  FUNCTION_METADATA,
  FUNCTIONS_METADATA,
  PARAM_METADATA,
  FunctionParamType,
  INPUT_SCHEMA_METADATA,
  OUTPUT_SCHEMA_METADATA,
  type FunctionParamMetadata,
} from "../decorators/index.js";
import { createMockContext, type MockContextOptions } from "./mock-context.js";
import {
  isMessagingExtensionMethod,
  parseMessagingExtensionInputParams,
} from "../utils/messaging-input-normalizer.js";

/**
 * Result of creating a test extension
 */
export interface TestExtensionResult<T> {
  /** The extension instance */
  instance: T;
  /** Extension name from metadata */
  extensionName: string;
  /** List of function names */
  functionNames: string[];
  /**
   * Call a function on the extension with automatic context creation
   *
   * @param functionName - The function name (without extension prefix)
   * @param params - The input parameters
   * @param contextOptions - Optional mock context options
   */
  callFunction: <TParams = unknown, TResult = unknown>(
    functionName: string,
    params?: TParams,
    contextOptions?: MockContextOptions
  ) => Promise<TResult>;
}

/**
 * Create a test extension instance with helper methods
 *
 * This utility allows testing extension classes without running NestJS.
 * It provides automatic context creation and function discovery.
 *
 * @example
 * ```typescript
 * import { createTestExtension, createMockContext } from '@channel.io/app-sdk-server/testing';
 *
 * describe('CalendarExtension', () => {
 *   it('should list event types', async () => {
 *     const { callFunction } = createTestExtension(CalendarExtension);
 *
 *     const result = await callFunction('listEventTypes', {});
 *
 *     expect(result.eventTypes).toHaveLength(3);
 *   });
 *
 *   it('should get availability with custom context', async () => {
 *     const { callFunction } = createTestExtension(CalendarExtension);
 *
 *     const result = await callFunction(
 *       'getAvailability',
 *       { eventTypeId: '1', startDate: '2024-01-01', endDate: '2024-01-02' },
 *       { channelId: 'custom-channel' }
 *     );
 *
 *     expect(result.slots).toBeDefined();
 *   });
 * });
 * ```
 *
 * @param ExtensionClass - The extension class decorated with @Extension
 * @param dependencies - Optional dependencies to inject into the constructor
 */
export function createTestExtension<T>(
  ExtensionClass: Type<T>,
  ...dependencies: unknown[]
): TestExtensionResult<T> {
  // Get extension metadata
  const extensionMeta = Reflect.getMetadata(EXTENSION_METADATA, ExtensionClass);
  if (!extensionMeta) {
    throw new Error(`Class ${ExtensionClass.name} is not decorated with @Extension`);
  }

  // Create instance with dependencies
  const instance = new ExtensionClass(...dependencies);

  // Discover functions
  const functionKeys: (string | symbol)[] =
    Reflect.getMetadata(FUNCTIONS_METADATA, ExtensionClass) ?? [];

  const functionNames = functionKeys.map((key) => {
    const funcMeta = Reflect.getMetadata(FUNCTION_METADATA, ExtensionClass, key) as
      { name?: string } | undefined;
    return funcMeta?.name ?? String(key);
  });

  // Create function caller
  const callFunction = async <TParams = unknown, TResult = unknown>(
    functionName: string,
    params?: TParams,
    contextOptions?: MockContextOptions
  ): Promise<TResult> => {
    // Find the method by function name
    const methodKey = functionKeys.find((key) => {
      const funcMeta = Reflect.getMetadata(FUNCTION_METADATA, ExtensionClass, key);
      return funcMeta?.name === functionName || String(key) === functionName;
    });

    if (!methodKey) {
      throw new Error(
        `Function "${functionName}" not found on ${ExtensionClass.name}. ` +
          `Available functions: ${functionNames.join(", ")}`
      );
    }

    // Get parameter metadata
    const paramMeta: FunctionParamMetadata[] =
      Reflect.getMetadata(PARAM_METADATA, ExtensionClass, methodKey) ?? [];

    // Get input schema for validation
    const inputSchema: z.ZodType | undefined = Reflect.getMetadata(
      INPUT_SCHEMA_METADATA,
      ExtensionClass,
      methodKey
    );

    // Validate input if schema exists
    let validatedParams = params;
    if (inputSchema && params !== undefined) {
      const fullName = `extension.${extensionMeta.name as string}.${functionName}`;
      if (isMessagingExtensionMethod(fullName)) {
        validatedParams = parseMessagingExtensionInputParams(inputSchema, params) as TParams;
      } else {
        validatedParams = inputSchema.parse(params) as TParams;
      }
    }

    // Create context
    const ctx = createMockContext(contextOptions);

    // Build arguments based on parameter decorators
    const args: unknown[] = [];
    const sortedParams = [...paramMeta].sort((a, b) => a.index - b.index);

    for (const param of sortedParams) {
      switch (param.type) {
        case FunctionParamType.CTX:
          args[param.index] = ctx;
          break;
        case FunctionParamType.INPUT:
          args[param.index] = validatedParams;
          break;
        case FunctionParamType.BODY:
          args[param.index] = { context: ctx, params: validatedParams };
          break;
      }
    }

    // If no parameter decorators, use default order: (ctx, params)
    if (sortedParams.length === 0) {
      args.push(ctx, validatedParams);
    }

    // Call the method
    const method = (instance as Record<string | symbol, unknown>)[methodKey] as (
      ...args: unknown[]
    ) => Promise<unknown>;

    const result = await method.apply(instance, args);

    // Validate output if schema exists
    const outputSchema: z.ZodType | undefined = Reflect.getMetadata(
      OUTPUT_SCHEMA_METADATA,
      ExtensionClass,
      methodKey
    );

    if (outputSchema) {
      return outputSchema.parse(result) as TResult;
    }

    return result as TResult;
  };

  return {
    instance,
    extensionName: extensionMeta.name,
    functionNames,
    callFunction,
  };
}
