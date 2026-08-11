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
  static readonly DEFAULT_SYSTEM_VERSION = "v1";

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

      const systemVersion =
        (extensionMeta.systemVersion as string | undefined) ??
        ExtensionDiscoveryService.DEFAULT_SYSTEM_VERSION;

      this.logger.log(`Discovered extension: ${extensionMeta.name} (${systemVersion})`);

      // Discover functions on this extension
      const functions = this.discoverFunctions(
        instance,
        metatype as Type,
        `extension.${extensionMeta.name as string}`,
        systemVersion
      );

      const metadata: ExtensionMetadata = {
        name: extensionMeta.name,
        systemVersion,
        exclusive: extensionMeta.exclusive ?? false,
        description: extensionMeta.description,
        instance,
        functions,
      };

      const extensionKey = this.registryKey(systemVersion, extensionMeta.name as string);
      if (this.extensions.has(extensionKey)) {
        throw new Error(
          `Duplicate extension "${extensionMeta.name as string}" for system version "${systemVersion}"`
        );
      }
      this.extensions.set(extensionKey, metadata);

      // Register functions globally for routing
      for (const func of functions) {
        const functionKey = this.registryKey(func.systemVersion, func.fullName);
        if (this.functionRegistry.has(functionKey)) {
          throw new Error(
            `Duplicate function name "${func.fullName}" for system version "${func.systemVersion}"`
          );
        }
        this.functionRegistry.set(functionKey, func);
        this.logger.debug(`Registered function: ${func.fullName} (${func.systemVersion})`);
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
        const functionKey = this.registryKey(func.systemVersion, func.fullName);
        if (this.functionRegistry.has(functionKey)) {
          throw new Error(
            `Duplicate function name "${func.fullName}" for system version "${func.systemVersion}"`
          );
        }
        this.functionRegistry.set(functionKey, func);
        this.logger.debug(`Registered function: ${func.fullName} (${func.systemVersion})`);
      }
    }
  }

  /**
   * Discover @Func decorated methods on a class
   */
  private discoverFunctions(
    instance: unknown,
    metatype: Type,
    namePrefix: string | null,
    extensionSystemVersion?: string
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

      if (extensionSystemVersion !== undefined && funcMeta.systemVersion !== undefined) {
        throw new Error(
          `@Func systemVersion cannot be used inside @Extension for function "${funcMeta.name}"`
        );
      }

      const systemVersion =
        extensionSystemVersion ??
        funcMeta.systemVersion ??
        ExtensionDiscoveryService.DEFAULT_SYSTEM_VERSION;

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
        systemVersion,
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
  getExtension(
    name: string,
    systemVersion = ExtensionDiscoveryService.DEFAULT_SYSTEM_VERSION
  ): ExtensionMetadata | undefined {
    return this.extensions.get(this.registryKey(systemVersion, name));
  }

  /**
   * Get a function by its full name (e.g., "extension.calendar.getAvailability")
   */
  getFunction(
    fullName: string,
    systemVersion = ExtensionDiscoveryService.DEFAULT_SYSTEM_VERSION
  ): FunctionMetadata | undefined {
    return this.functionRegistry.get(this.registryKey(systemVersion, fullName));
  }

  /**
   * Get all registered functions
   */
  getAllFunctions(systemVersion?: string): FunctionMetadata[] {
    const functions = Array.from(this.functionRegistry.values());
    return systemVersion === undefined
      ? functions
      : functions.filter((func) => func.systemVersion === systemVersion);
  }

  /**
   * Get registered functions that are exposed through getFunctions.
   */
  getPublicFunctions(
    systemVersion = ExtensionDiscoveryService.DEFAULT_SYSTEM_VERSION
  ): FunctionMetadata[] {
    return this.getAllFunctions(systemVersion).filter((func) => !func.test && !func.hidden);
  }

  /**
   * Get registered test-only functions.
   */
  getTestFunctions(
    systemVersion = ExtensionDiscoveryService.DEFAULT_SYSTEM_VERSION
  ): FunctionMetadata[] {
    return this.getAllFunctions(systemVersion).filter((func) => func.test && !func.hidden);
  }

  /**
   * Get every system version represented by an Extension or Function.
   * An empty app still serves the default v1 Function catalog.
   */
  getSupportedSystemVersions(): string[] {
    const versions = new Set<string>();
    for (const extension of this.extensions.values()) {
      versions.add(extension.systemVersion);
    }
    for (const func of this.functionRegistry.values()) {
      versions.add(func.systemVersion);
    }
    if (versions.size === 0) {
      versions.add(ExtensionDiscoveryService.DEFAULT_SYSTEM_VERSION);
    }
    return Array.from(versions);
  }

  /**
   * Check if any extensions are registered
   */
  hasExtensions(): boolean {
    return this.extensions.size > 0;
  }

  private registryKey(systemVersion: string, name: string): string {
    return `${systemVersion}\u0000${name}`;
  }
}
