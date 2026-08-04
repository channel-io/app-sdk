import { Injectable, type OnModuleInit, Logger, type Type } from "@nestjs/common";
import { DiscoveryService, Reflector } from "@nestjs/core";
import { zodToJsonSchema } from "zod-to-json-schema";
import type { z } from "zod";
import {
  EXTENSION_METADATA,
  FUNCTION_METADATA,
  FUNCTIONS_METADATA,
  INPUT_SCHEMA_METADATA,
  OUTPUT_SCHEMA_METADATA,
  DESCRIPTION_METADATA,
  PARAM_METADATA,
  FunctionParamType,
  type FunctionMetadataValue,
  type FunctionParamMetadata,
} from "../decorators/index.js";
import type { ExtensionMetadata, FunctionMetadata } from "./metadata.interface.js";
import { parseFunctionInputParams } from "../utils/function-input-validator.js";

@Injectable()
export class ExtensionDiscoveryService implements OnModuleInit {
  private readonly logger = new Logger(ExtensionDiscoveryService.name);
  private readonly extensions = new Map<string, ExtensionMetadata>();
  private readonly functionRegistry = new Map<string, FunctionMetadata>();

  constructor(
    private readonly discoveryService: DiscoveryService,
    private readonly reflector: Reflector
  ) {}

  onModuleInit() {
    this.discoverExtensions();
    this.discoverStandaloneFunctions();
  }

  /**
   * Discover all @Extension decorated classes
   */
  private discoverExtensions() {
    const providers = this.discoveryService.getProviders();

    for (const wrapper of providers) {
      const { instance, metatype } = wrapper;
      // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
      if (!instance || !metatype) continue;

      const extensionMeta = this.reflector.get(EXTENSION_METADATA, metatype);
      if (!extensionMeta) continue;

      this.logger.log(`Discovered extension: ${extensionMeta.name}`);

      // Discover functions on this extension
      const functions = this.discoverFunctions(
        instance,
        metatype as Type,
        `extension.${extensionMeta.name as string}`
      );

      const metadata: ExtensionMetadata = {
        name: extensionMeta.name,
        systemVersion: extensionMeta.systemVersion ?? "v1",
        exclusive: extensionMeta.exclusive ?? false,
        description: extensionMeta.description,
        instance,
        functions,
      };

      this.extensions.set(extensionMeta.name, metadata);

      // Register functions globally for routing
      for (const func of functions) {
        if (this.functionRegistry.has(func.fullName)) {
          throw new Error(`Duplicate function name "${func.fullName}"`);
        }
        this.functionRegistry.set(func.fullName, func);
        this.logger.debug(`Registered function: ${func.fullName}`);
      }
    }
  }

  /**
   * Discover standalone @Func decorated classes (no @Extension)
   */
  private discoverStandaloneFunctions() {
    const providers = this.discoveryService.getProviders();

    for (const wrapper of providers) {
      const { instance, metatype } = wrapper;
      // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
      if (!instance || !metatype) continue;

      // Skip @Extension classes (already handled)
      if (this.reflector.get(EXTENSION_METADATA, metatype)) continue;

      // Check for @Func methods
      const functionKeys: (string | symbol)[] =
        Reflect.getMetadata(FUNCTIONS_METADATA, metatype) ?? [];
      if (!functionKeys.length) continue;

      this.logger.log(`Discovered standalone functions on: ${metatype.name}`);

      // namePrefix = null → fullName = funcMeta.name (as-is)
      const functions = this.discoverFunctions(instance, metatype as Type, null);

      for (const func of functions) {
        if (this.functionRegistry.has(func.fullName)) {
          throw new Error(`Duplicate function name "${func.fullName}"`);
        }
        this.functionRegistry.set(func.fullName, func);
        this.logger.debug(`Registered function: ${func.fullName}`);
      }
    }
  }

  /**
   * Discover @Func decorated methods on a class
   */
  private discoverFunctions(
    instance: unknown,
    metatype: Type,
    namePrefix: string | null
  ): FunctionMetadata[] {
    const functionKeys: (string | symbol)[] =
      Reflect.getMetadata(FUNCTIONS_METADATA, metatype) ?? [];

    const results: FunctionMetadata[] = [];

    for (const methodName of functionKeys) {
      const funcMeta: FunctionMetadataValue | undefined = Reflect.getMetadata(
        FUNCTION_METADATA,
        metatype,
        methodName
      );

      if (!funcMeta) continue;

      // Get schema metadata
      const inputSchema: z.ZodSchema | undefined = Reflect.getMetadata(
        INPUT_SCHEMA_METADATA,
        metatype,
        methodName
      );
      const outputSchema: z.ZodSchema | undefined = Reflect.getMetadata(
        OUTPUT_SCHEMA_METADATA,
        metatype,
        methodName
      );
      const description: string | undefined =
        Reflect.getMetadata(DESCRIPTION_METADATA, metatype, methodName) ?? funcMeta.description;

      // Get parameter metadata for injection
      const paramMeta: FunctionParamMetadata[] =
        Reflect.getMetadata(PARAM_METADATA, metatype, methodName) ?? [];

      // Build full method name for routing
      const fullName = namePrefix ? `${namePrefix}.${funcMeta.name}` : funcMeta.name;

      // Convert schemas to JSON Schema
      const inputJsonSchema = inputSchema
        ? (zodToJsonSchema(inputSchema, { $refStrategy: "none" }) as Record<string, unknown>)
        : undefined;
      const outputJsonSchema = outputSchema
        ? (zodToJsonSchema(outputSchema, { $refStrategy: "none" }) as Record<string, unknown>)
        : undefined;

      // Create bound handler with parameter injection
      const handler = this.createHandler(
        instance,
        fullName,
        methodName,
        paramMeta,
        inputSchema,
        outputSchema
      );

      const funcMetadata: FunctionMetadata = {
        name: funcMeta.name,
        fullName,
        methodName,
        handler,
      };

      if (description) {
        funcMetadata.description = description;
      }
      if (funcMeta.test) {
        funcMetadata.test = true;
      }
      if (funcMeta.hidden) {
        funcMetadata.hidden = true;
      }
      if (inputSchema) {
        funcMetadata.inputSchema = inputSchema;
      }
      if (outputSchema) {
        funcMetadata.outputSchema = outputSchema;
      }
      if (inputJsonSchema) {
        funcMetadata.inputJsonSchema = inputJsonSchema;
      }
      if (outputJsonSchema) {
        funcMetadata.outputJsonSchema = outputJsonSchema;
      }

      results.push(funcMetadata);
    }

    return results;
  }

  /**
   * Create a handler function with parameter injection and validation
   */
  private createHandler(
    instance: unknown,
    fullName: string,
    methodName: string | symbol,
    paramMeta: FunctionParamMetadata[],
    inputSchema?: z.ZodSchema,
    outputSchema?: z.ZodSchema
  ): (ctx: unknown, params: unknown) => Promise<unknown> {
    const method = (instance as Record<string | symbol, unknown>)[methodName] as (
      ...args: unknown[]
    ) => Promise<unknown>;

    return async (ctx: unknown, params: unknown) => {
      // Validate input if schema is defined
      let validatedParams = params;
      if (inputSchema) {
        validatedParams = parseFunctionInputParams(fullName, inputSchema, params);
      }

      // Build arguments based on parameter decorators
      const args: unknown[] = [];

      // Sort by index to maintain order
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
      const result = await method.apply(instance, args);

      // Validate output if schema is defined
      if (outputSchema) {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-return
        return outputSchema.parse(result);
      }

      return result;
    };
  }

  /**
   * Get all discovered extensions
   */
  getExtensions(): ExtensionMetadata[] {
    return Array.from(this.extensions.values());
  }

  /**
   * Get a specific extension by name
   */
  getExtension(name: string): ExtensionMetadata | undefined {
    return this.extensions.get(name);
  }

  /**
   * Get a function by its full name (e.g., "extension.calendar.getAvailability")
   */
  getFunction(fullName: string): FunctionMetadata | undefined {
    return this.functionRegistry.get(fullName);
  }

  /**
   * Get all registered functions
   */
  getAllFunctions(): FunctionMetadata[] {
    return Array.from(this.functionRegistry.values());
  }

  /**
   * Get registered functions that are exposed through getFunctions.
   */
  getPublicFunctions(): FunctionMetadata[] {
    return this.getAllFunctions().filter((func) => !func.test && !func.hidden);
  }

  /**
   * Get registered test-only functions.
   */
  getTestFunctions(): FunctionMetadata[] {
    return this.getAllFunctions().filter((func) => func.test && !func.hidden);
  }

  /**
   * Check if any extensions are registered
   */
  hasExtensions(): boolean {
    return this.extensions.size > 0;
  }
}
