import {
  type DynamicModule,
  Module,
  Injectable,
  Inject,
  type OnModuleInit,
  Logger,
  Controller,
  Put,
  Body,
  Param,
  HttpException,
  HttpStatus,
} from "@nestjs/common";
import type { z } from "zod";
import { zodToJsonSchema } from "zod-to-json-schema";
import type {
  Context,
  FunctionCallRequest,
  FunctionCallResponse,
  FunctionSchema,
  GetFunctionsResponse,
} from "@channel.io/app-sdk-core";
import {
  FunctionCallError,
  FunctionNotFoundError,
  ValidationError,
} from "@channel.io/app-sdk-core";
import { AppStoreClient } from "../appstore/client.js";
import { normalizeExtensionResult } from "../utils/extension-result-normalizer.js";
import { parseFunctionInputParams } from "../utils/function-input-validator.js";

const SIMPLE_FUNCTIONS = Symbol("SIMPLE_FUNCTIONS");
const SIMPLE_OPTIONS = Symbol("SIMPLE_OPTIONS");

interface SimpleFunctionDefinition {
  name: string;
  description?: string;
  test?: boolean;
  inputSchema: z.ZodSchema;
  inputJsonSchema: Record<string, unknown>;
  handler: (ctx: Context, params: unknown) => Promise<unknown>;
}

interface SimpleAppOptions {
  appId: string;
  appSecret: string;
  autoRegister?: boolean;
  appStoreUrl?: string;
  debug?: boolean;
}

/**
 * Simple MCP-like API for Channel.io apps
 *
 * @example
 * ```typescript
 * const app = new ChannelApp({ appId: "...", appSecret: "..." })
 *   .function(
 *     "calendar.getAvailability",
 *     z.object({ startDate: z.string(), endDate: z.string() }),
 *     async (ctx, { startDate, endDate }) => {
 *       return { slots: [] };
 *     }
 *   )
 *   .function(
 *     "calendar.createBooking",
 *     z.object({ slotId: z.string() }),
 *     async (ctx, params) => {
 *       return { bookingId: "123" };
 *     }
 *   );
 *
 * // In app.module.ts
 * @Module({
 *   imports: [app.toModule()],
 * })
 * export class AppModule {}
 * ```
 */
export class ChannelApp {
  private functions = new Map<string, SimpleFunctionDefinition>();
  private readonly options: SimpleAppOptions;

  constructor(options: SimpleAppOptions) {
    this.options = options;
  }

  /**
   * Define a function (MCP-style)
   *
   * @param name Function name (e.g., "calendar.getAvailability")
   * @param inputSchema Zod schema for input validation
   * @param handler Function handler
   * @param options Additional options
   */
  function<TInput extends z.ZodSchema>(
    name: string,
    inputSchema: TInput,
    handler: (ctx: Context, params: z.infer<TInput>) => Promise<unknown>,
    options?: { description?: string }
  ): this {
    return this.defineFunction(name, inputSchema, handler, options, false);
  }

  /**
   * Define a test-only function.
   *
   * Test functions are discoverable through
   * `extension.core.function.getTestFunctions`, but are intentionally hidden from
   * `extension.core.function.getFunctions`.
   */
  testFunction<TInput extends z.ZodSchema>(
    name: string,
    inputSchema: TInput,
    handler: (ctx: Context, params: z.infer<TInput>) => Promise<unknown>,
    options?: { description?: string }
  ): this {
    return this.defineFunction(name, inputSchema, handler, options, true);
  }

  private defineFunction<TInput extends z.ZodSchema>(
    name: string,
    inputSchema: TInput,
    handler: (ctx: Context, params: z.infer<TInput>) => Promise<unknown>,
    options: { description?: string } | undefined,
    test: boolean
  ): this {
    const inputJsonSchema = zodToJsonSchema(inputSchema, { $refStrategy: "none" }) as Record<
      string,
      unknown
    >;

    const def: SimpleFunctionDefinition = {
      name,
      inputSchema,
      inputJsonSchema,
      test,
      handler: async (ctx, params) => {
        const fullName = name.startsWith("extension.") ? name : `extension.${name}`;
        const validated = parseFunctionInputParams(fullName, inputSchema, params);
        return handler(ctx, validated);
      },
    };

    if (options?.description) {
      def.description = options.description;
    }

    this.functions.set(name, def);

    return this;
  }

  /**
   * Create NestJS module from the defined functions
   */
  toModule(): DynamicModule {
    return {
      module: ChannelAppSimpleModule,
      providers: [
        { provide: SIMPLE_FUNCTIONS, useValue: this.functions },
        { provide: SIMPLE_OPTIONS, useValue: this.options },
        // eslint-disable-next-line @typescript-eslint/no-deprecated
        ChannelAppSimpleService,
      ],
      controllers: [ChannelAppSimpleController],
      // eslint-disable-next-line @typescript-eslint/no-deprecated
      exports: [ChannelAppSimpleService],
      global: true,
    };
  }
}

/**
 * Simple service for handling function calls
 *
 * @deprecated This simple service is unused by the SDK and will be removed in the next minor release.
 * Use `ChannelAppModule` with decorators instead.
 */
@Injectable()
class ChannelAppSimpleService implements OnModuleInit {
  private readonly logger = new Logger("ChannelAppSimpleService");

  constructor(
    @Inject(SIMPLE_FUNCTIONS)
    private readonly functions: Map<string, SimpleFunctionDefinition>,
    @Inject(SIMPLE_OPTIONS)
    private readonly options: SimpleAppOptions
  ) {}

  async onModuleInit() {
    this.logger.log(`Registered ${this.functions.size} function(s)`);

    if (this.options.debug) {
      for (const name of this.functions.keys()) {
        this.logger.debug(`  - ${name}`);
      }
    }

    if (this.options.autoRegister) {
      await this.autoRegister();
    }
  }

  private async autoRegister() {
    // eslint-disable-next-line @typescript-eslint/no-deprecated
    const client = new AppStoreClient({
      appId: this.options.appId,
      appSecret: this.options.appSecret,
      appStoreUrl: this.options.appStoreUrl,
      debug: this.options.debug,
    });

    // Extract unique extension names from function names
    const extensions = new Set<string>();
    for (const name of this.functions.keys()) {
      const [extensionName] = name.split(".");
      if (extensionName) {
        extensions.add(extensionName);
      }
    }

    for (const extensionName of extensions) {
      try {
        this.logger.log(`Auto-registering extension: ${extensionName}`);
        const result = await client.registerExtension({
          extensionName,
          systemVersion: "v1",
        });

        if (result.success) {
          this.logger.log(`Successfully registered extension: ${extensionName}`);
        } else {
          const errorMsg = result.error_message ?? "Unknown error";
          this.logger.warn(`Failed to register extension ${extensionName}: ${errorMsg}`);
        }
      } catch (error) {
        this.logger.error(`Error registering extension ${extensionName}: ${String(error)}`);
      }
    }
  }

  async handleFunctionCall(request: FunctionCallRequest): Promise<FunctionCallResponse> {
    const { method, context, params } = request;

    // Handle getFunctions
    if (method === "extension.core.function.getFunctions") {
      return this.getFunctions();
    }

    // Handle getTestFunctions
    if (method === "extension.core.function.getTestFunctions") {
      return this.getTestFunctions();
    }

    // Find function - support both "extension.name.func" and direct "name.func" format
    let func = this.functions.get(method);

    // Try stripping "extension." prefix
    if (!func && method.startsWith("extension.")) {
      const withoutPrefix = method.slice("extension.".length);
      func = this.functions.get(withoutPrefix);
    }

    if (!func) {
      throw new FunctionNotFoundError(method);
    }

    try {
      const result = normalizeExtensionResult(method, await func.handler(context, params ?? {}));
      return { result };
    } catch (error) {
      if (error instanceof FunctionCallError) {
        return { error: error.toResponse() };
      }

      throw error;
    }
  }

  getFunctions(): GetFunctionsResponse {
    return this.toGetFunctionsResponse([...this.functions.values()].filter((func) => !func.test));
  }

  getTestFunctions(): GetFunctionsResponse {
    return this.toGetFunctionsResponse([...this.functions.values()].filter((func) => func.test));
  }

  private toGetFunctionsResponse(
    functionDefinitions: SimpleFunctionDefinition[]
  ): GetFunctionsResponse {
    const functions: FunctionSchema[] = [];

    for (const func of functionDefinitions) {
      const schema: FunctionSchema = {
        name: `extension.${func.name}`,
        inputSchema: func.inputJsonSchema,
      };

      if (func.description) {
        schema.description = func.description;
      }

      functions.push(schema);
    }

    return {
      result: {
        functions,
        success: true,
        errorMessage: "",
      },
    };
  }
}

/**
 * Simple controller for handling function calls
 */
@Controller("functions")
class ChannelAppSimpleController {
  // eslint-disable-next-line @typescript-eslint/no-deprecated
  constructor(private readonly service: ChannelAppSimpleService) {}

  @Put(":version")
  async handleVersionedFunctions(
    @Param("version") _version: string,
    @Body() body: FunctionCallRequest
  ) {
    return this.handleRequest(body);
  }

  private async handleRequest(body: FunctionCallRequest) {
    try {
      return await this.service.handleFunctionCall(body);
    } catch (error) {
      if (error instanceof FunctionNotFoundError) {
        throw new HttpException(
          { error: "FUNCTION_NOT_FOUND", message: error.message },
          HttpStatus.NOT_FOUND
        );
      }
      if (error instanceof ValidationError) {
        throw new HttpException(
          {
            error: "VALIDATION_ERROR",
            message: error.message,
            details: error.details,
          },
          HttpStatus.BAD_REQUEST
        );
      }
      throw new HttpException(
        {
          error: "INTERNAL_ERROR",
          message: error instanceof Error ? error.message : "Unknown error",
        },
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }
}

@Module({})
class ChannelAppSimpleModule {}

// eslint-disable-next-line @typescript-eslint/no-deprecated
export { ChannelAppSimpleService };
