import {
  Inject,
  Injectable,
  type OnApplicationBootstrap,
  type OnModuleInit,
  Logger,
  Optional,
} from "@nestjs/common";
import { HttpAdapterHost } from "@nestjs/core";
import type { Server } from "node:http";
import {
  type FunctionCallRequest,
  type FunctionCallResponse,
  type FunctionSchema,
  type GetFunctionsResponse,
  FunctionCallError,
  FunctionNotFoundError,
} from "@channel.io/app-sdk-core";
import {
  CHANNEL_APP_OPTIONS,
  type ChannelAppModuleOptions,
  type AutoRegisterResult,
} from "./types.js";
import { NativeFunctionClient } from "../native/client.js";
import { TokenManager } from "../token/manager.js";
import { ExtensionDiscoveryService } from "../discovery/extension-discovery.service.js";
import { normalizeExtensionResult } from "../utils/extension-result-normalizer.js";
import { sanitizeForLogging } from "../utils/sanitize-for-logging.js";

const DEFAULT_AUTO_REGISTER_MAX_ATTEMPTS = 3;
const DEFAULT_AUTO_REGISTER_INITIAL_BACKOFF_MS = 1000;
const DEFAULT_AUTO_REGISTER_MAX_BACKOFF_MS = 5000;

/**
 * Version mismatch error for when a function call targets the wrong version
 */
export class VersionMismatchError extends Error {
  constructor(
    public readonly requestedVersion: string,
    public readonly availableVersions: string[]
  ) {
    super(
      `Version '${requestedVersion}' not found. Available versions: ${availableVersions.join(", ")}`
    );
    this.name = "VersionMismatchError";
  }
}

interface AutoRegisterPlan {
  targets: {
    extensionName: string;
    systemVersion: string;
  }[];
  usesCoreFallback: boolean;
}

@Injectable()
export class ChannelAppService implements OnModuleInit, OnApplicationBootstrap {
  private readonly logger = new Logger(ChannelAppService.name);

  constructor(
    @Inject(CHANNEL_APP_OPTIONS)
    private readonly options: ChannelAppModuleOptions,
    private readonly httpAdapterHost: HttpAdapterHost,
    private readonly nativeClient: NativeFunctionClient,
    private readonly tokenManager: TokenManager,
    @Optional()
    private readonly discoveryService?: ExtensionDiscoveryService
  ) {}

  onModuleInit() {
    // Log discovered extensions
    if (this.discoveryService?.hasExtensions()) {
      const extensions = this.discoveryService.getExtensions();
      this.logger.log(`Discovered ${extensions.length} extension(s) via decorators`);

      for (const ext of extensions) {
        this.logger.log(
          `  - ${ext.name} (${ext.systemVersion}): ${ext.functions.length} function(s)`
        );
        if (this.options.debug) {
          for (const func of ext.functions) {
            this.logger.debug(`    - ${func.fullName}`);
          }
        }
      }
    } else if (this.options.autoRegister) {
      this.logger.log(
        "No extensions discovered via decorators. " +
          `Will auto-register "${ChannelAppService.CORE_EXTENSION_NAME}" extension.`
      );
    }

    // Log standalone functions
    const allFunctions = this.discoveryService?.getAllFunctions() ?? [];
    const extensions = this.discoveryService?.getExtensions() ?? [];
    const extensionFunctionCount = extensions.reduce((sum, e) => sum + e.functions.length, 0);
    const standaloneFunctionCount = allFunctions.length - extensionFunctionCount;
    if (standaloneFunctionCount > 0) {
      this.logger.log(`Discovered ${standaloneFunctionCount} standalone function(s)`);
    }
  }

  onApplicationBootstrap() {
    if (this.options.autoRegister) {
      // Register extensions only after the HTTP server starts listening.
      // AppStore calls back into our app (e.g., getFunctions) immediately after
      // registration, so the server must be ready to accept requests first.
      const server = this.httpAdapterHost.httpAdapter.getHttpServer() as Server;
      // eslint-disable-next-line @typescript-eslint/no-misused-promises
      server.once("listening", () => this.autoRegisterExtensions());
    }
  }

  /**
   * Default extension name used when no @Extension decorators are found.
   * Apps that only use native functions (e.g., cron bots) still need to
   * register a system version; this "core" extension serves that purpose.
   */
  static readonly CORE_EXTENSION_NAME = "core";

  /**
   * Default system version used for the core extension fallback.
   */
  static readonly DEFAULT_SYSTEM_VERSION = "v1";

  /**
   * Register all extensions with the AppStore.
   *
   * Call this after `app.listen()` to ensure the HTTP server is ready before
   * AppStore attempts its getFunctions callback.
   *
   * If no extensions are discovered via decorators, automatically registers
   * a "core" extension so that extension-less apps (e.g., cron bots) can
   * still have a system version registered.
   */
  private async autoRegisterExtensions(): Promise<void> {
    const plan = this.getAutoRegisterPlan();
    if (plan.usesCoreFallback) {
      this.logger.log(
        "No extensions discovered. Auto-registering core extension for system version registration."
      );
    }

    const maxAttempts = this.autoRegisterMaxAttempts();
    let backoffMs = this.autoRegisterInitialBackoffMs();
    let results: AutoRegisterResult[] = [];
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      results = await this.autoRegisterOnce(plan);
      if (this.autoRegisterSucceeded(results) || attempt === maxAttempts) {
        this.options.onAutoRegister?.(results);
        return;
      }

      this.logger.warn(
        `Auto-registration attempt ${attempt}/${maxAttempts} failed. Retrying in ${backoffMs}ms.`
      );
      await this.sleep(backoffMs);
      backoffMs = this.nextAutoRegisterBackoffMs(backoffMs);
    }

    this.options.onAutoRegister?.(results);
  }

  private async autoRegisterOnce(plan: AutoRegisterPlan): Promise<AutoRegisterResult[]> {
    let accessToken: string;
    try {
      const appToken = await this.tokenManager.getAppToken();
      accessToken = appToken.accessToken;
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      const results: AutoRegisterResult[] = plan.targets.map((target) => ({
        extensionName: target.extensionName,
        systemVersion: target.systemVersion,
        success: false,
        error: errorMsg,
      }));
      this.logger.error(`Error issuing app token: ${errorMsg}`);
      return results;
    }

    const results: AutoRegisterResult[] = [];
    for (const target of plan.targets) {
      await this.registerSingleExtension(
        accessToken,
        target.extensionName,
        target.systemVersion,
        results
      );
    }

    return results;
  }

  private getAutoRegisterPlan(): AutoRegisterPlan {
    const extensions = this.discoveryService?.getExtensions() ?? [];

    if (extensions.length === 0) {
      return {
        targets: [
          {
            extensionName: ChannelAppService.CORE_EXTENSION_NAME,
            systemVersion: ChannelAppService.DEFAULT_SYSTEM_VERSION,
          },
        ],
        usesCoreFallback: true,
      };
    }

    return {
      targets: extensions.map((extension) => ({
        extensionName: extension.name,
        systemVersion: extension.systemVersion,
      })),
      usesCoreFallback: false,
    };
  }

  /**
   * Register a single extension with the AppStore and collect the result.
   */
  private async registerSingleExtension(
    accessToken: string,
    extensionName: string,
    systemVersion: string,
    results: AutoRegisterResult[]
  ): Promise<void> {
    try {
      this.logger.log(`Auto-registering extension: ${extensionName} (${systemVersion})`);
      const result = await this.nativeClient.registerExtension(
        this.options.appId,
        extensionName,
        systemVersion,
        accessToken
      );

      if (result.success) {
        this.logger.log(`Successfully registered extension: ${extensionName}`);
        results.push({
          extensionName,
          systemVersion,
          success: true,
        });
      } else {
        const errorMsg =
          result.errorMessage ?? result.validationErrors?.join(", ") ?? "Unknown error";
        this.logger.warn(`Failed to register extension ${extensionName}: ${errorMsg}`);
        results.push({
          extensionName,
          systemVersion,
          success: false,
          error: errorMsg,
        });
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      this.logger.error(`Error registering extension ${extensionName}: ${errorMsg}`);
      results.push({
        extensionName,
        systemVersion,
        success: false,
        error: errorMsg,
      });
    }
  }

  private autoRegisterSucceeded(results: AutoRegisterResult[]): boolean {
    return results.length > 0 && results.every((result) => result.success);
  }

  private autoRegisterMaxAttempts(): number {
    return Math.max(1, this.options.autoRegisterMaxAttempts ?? DEFAULT_AUTO_REGISTER_MAX_ATTEMPTS);
  }

  private autoRegisterInitialBackoffMs(): number {
    return this.normalizeBackoffMs(
      this.options.autoRegisterInitialBackoffMs,
      DEFAULT_AUTO_REGISTER_INITIAL_BACKOFF_MS
    );
  }

  private autoRegisterMaxBackoffMs(): number {
    return this.normalizeBackoffMs(
      this.options.autoRegisterMaxBackoffMs,
      DEFAULT_AUTO_REGISTER_MAX_BACKOFF_MS
    );
  }

  private nextAutoRegisterBackoffMs(current: number): number {
    return Math.min(current * 2, this.autoRegisterMaxBackoffMs());
  }

  private normalizeBackoffMs(value: number | undefined, fallback: number): number {
    if (value === undefined || !Number.isFinite(value) || value <= 0) {
      return fallback;
    }
    return value;
  }

  private async sleep(delayMs: number): Promise<void> {
    await new Promise((resolve) => setTimeout(resolve, delayMs));
  }

  /**
   * Get all registered versions.
   * When no extensions are discovered and autoRegister is enabled,
   * returns the default system version ("v1") for the core extension.
   */
  getRegisteredVersions(): string[] {
    const versions = new Set<string>();
    const extensions = this.discoveryService?.getExtensions() ?? [];

    if (extensions.length === 0 && this.options.autoRegister) {
      versions.add(ChannelAppService.DEFAULT_SYSTEM_VERSION);
    } else {
      for (const ext of extensions) {
        versions.add(ext.systemVersion);
      }
    }

    return Array.from(versions);
  }

  /**
   * Handle incoming function call
   * @param request The function call request
   * @param _version Optional version from URL path (e.g., "v1")
   */
  async handleFunctionCall(
    request: FunctionCallRequest,
    _version?: string
  ): Promise<FunctionCallResponse> {
    const { method, context, params } = request;

    // Handle getFunctions request
    if (method === "extension.core.function.getFunctions") {
      return this.getFunctions();
    }

    // Handle getTestFunctions request
    if (method === "extension.core.function.getTestFunctions") {
      return this.getTestFunctions();
    }

    // Find the function from discovery service
    const func = this.discoveryService?.getFunction(method);

    if (!func) {
      throw new FunctionNotFoundError(method);
    }

    if (this.options.debug) {
      this.logger.debug(`Calling function: ${method}`);
      this.logger.debug(`Request: ${JSON.stringify(sanitizeForLogging(request))}`);
    }

    try {
      // Execute the handler
      const result = normalizeExtensionResult(method, await func.handler(context, params ?? {}));

      if (this.options.debug) {
        this.logger.debug(`Output: ${JSON.stringify(sanitizeForLogging(result))}`);
      }

      return { result };
    } catch (error) {
      if (error instanceof FunctionCallError) {
        const response: FunctionCallResponse = { error: error.toResponse() };

        if (this.options.debug) {
          this.logger.debug(`Error: ${JSON.stringify(sanitizeForLogging(response.error))}`);
        }

        return response;
      }

      throw error;
    }
  }

  /**
   * Get list of all registered functions
   */
  getFunctions(): GetFunctionsResponse {
    const allFunctions = this.discoveryService?.getPublicFunctions() ?? [];

    return this.toGetFunctionsResponse(allFunctions);
  }

  /**
   * Get list of all registered test functions
   */
  getTestFunctions(): GetFunctionsResponse {
    const allFunctions = this.discoveryService?.getTestFunctions() ?? [];

    return this.toGetFunctionsResponse(allFunctions);
  }

  private toGetFunctionsResponse(
    allFunctions: NonNullable<ReturnType<ExtensionDiscoveryService["getAllFunctions"]>>
  ): GetFunctionsResponse {
    const functions: FunctionSchema[] = allFunctions.map((func) => {
      const schema: FunctionSchema = {
        name: func.fullName,
        inputSchema: func.inputJsonSchema ?? { type: "object" },
      };

      if (func.description) {
        schema.description = func.description;
      }

      if (func.deprecated !== undefined) {
        schema.deprecated = func.deprecated;
      }

      if (func.outputJsonSchema) {
        schema.outputSchema = func.outputJsonSchema;
      }

      return schema;
    });

    return {
      result: {
        functions,
        success: true,
        errorMessage: "",
      },
    };
  }

  /**
   * Get app configuration
   */
  getAppConfig() {
    return {
      appId: this.options.appId,
    };
  }
}
