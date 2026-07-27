import type {
  AppStoreClientConfig,
  JsonRpcRequest,
  JsonRpcResponse,
  RegisterExtensionParams,
  RegisterExtensionResult,
  UnregisterExtensionParams,
  UnregisterExtensionResult,
} from "./types.js";

/**
 * Default AppStore API URL
 */
const DEFAULT_APPSTORE_URL = "https://app-store.channel.io";

/**
 * AppStore API client for extension registration
 *
 * @deprecated This client is unused by the SDK and will be removed in the next minor release.
 * Use `NativeFunctionClient` and `TokenManager` instead.
 *
 * @example
 * ```typescript
 * const client = new AppStoreClient({
 *   appId: 'your-app-id',
 *   appSecret: 'your-app-secret',
 * });
 *
 * // Register an extension
 * const result = await client.registerExtension({
 *   extensionName: 'calendar',
 *   systemVersion: 'v1',
 * });
 * ```
 */
export class AppStoreClient {
  private readonly config: Required<
    Pick<AppStoreClientConfig, "appId" | "appSecret" | "appStoreUrl">
  > &
    AppStoreClientConfig;
  private readonly debug: boolean;

  constructor(config: AppStoreClientConfig) {
    this.config = {
      ...config,
      appStoreUrl: config.appStoreUrl ?? DEFAULT_APPSTORE_URL,
    };
    this.debug = config.debug ?? false;
  }

  /**
   * Register an extension with the AppStore
   *
   * @param options Extension registration options
   * @returns Registration result with all registered extensions
   */
  async registerExtension(options: {
    extensionName: string;
    systemVersion: string;
  }): Promise<RegisterExtensionResult> {
    const params: RegisterExtensionParams = {
      app_id: this.config.appId,
      system_version: options.systemVersion,
      extension_name: options.extensionName,
    };

    return this.callJsonRpc<RegisterExtensionParams, RegisterExtensionResult>(
      "registerExtension",
      params
    );
  }

  /**
   * Unregister an extension from the AppStore
   *
   * @param options Extension unregistration options
   * @returns Unregistration result
   */
  async unregisterExtension(options: {
    extensionName: string;
    systemVersion: string;
  }): Promise<UnregisterExtensionResult> {
    const params: UnregisterExtensionParams = {
      app_id: this.config.appId,
      system_version: options.systemVersion,
      extension_name: options.extensionName,
    };

    return this.callJsonRpc<UnregisterExtensionParams, UnregisterExtensionResult>(
      "unregisterExtension",
      params
    );
  }

  /**
   * Register multiple extensions at once
   *
   * @param extensions Array of extensions to register
   * @returns Array of registration results
   */
  async registerExtensions(
    extensions: { extensionName: string; systemVersion: string }[]
  ): Promise<RegisterExtensionResult[]> {
    const results: RegisterExtensionResult[] = [];

    for (const ext of extensions) {
      try {
        const result = await this.registerExtension(ext);
        results.push(result);
      } catch (error) {
        results.push({
          success: false,
          error_message: error instanceof Error ? error.message : String(error),
        });
      }
    }

    return results;
  }

  /**
   * Make a JSON-RPC call to the AppStore
   */
  private async callJsonRpc<TParams, TResult>(method: string, params: TParams): Promise<TResult> {
    const url = `${this.config.appStoreUrl}/general/v1/native/functions`;

    const request: JsonRpcRequest<TParams> = {
      jsonrpc: "2.0",
      method,
      params,
      id: Date.now(),
    };

    this.log(`Calling ${method}`, params);

    const response = await fetch(url, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        "X-App-Id": this.config.appId,
        "X-App-Secret": this.config.appSecret,
      },
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      throw new AppStoreError(
        `AppStore API request failed: ${response.status} ${response.statusText}`,
        response.status,
        errorBody
      );
    }

    const jsonResponse = (await response.json()) as JsonRpcResponse<TResult>;

    if (jsonResponse.error) {
      throw new AppStoreError(
        jsonResponse.error.message,
        jsonResponse.error.code,
        JSON.stringify(jsonResponse.error.data)
      );
    }

    this.log(`${method} response`, jsonResponse.result);

    return jsonResponse.result as TResult;
  }

  /**
   * Debug logging
   */
  private log(message: string, data?: unknown): void {
    if (this.debug) {
      if (data !== undefined) {
        console.debug(`[AppStoreClient] ${message}`, data);
      } else {
        console.debug(`[AppStoreClient] ${message}`);
      }
    }
  }
}

/**
 * AppStore API error
 */
export class AppStoreError extends Error {
  constructor(
    message: string,
    public readonly code?: number,
    public readonly responseBody?: string
  ) {
    super(message);
    this.name = "AppStoreError";
  }
}
