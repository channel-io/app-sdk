import type {
  Context,
  NativeCreateAppDataTableParams,
  NativeCreateAppDataTableResult,
  NativeCreateAppDataTableSchemaParams,
  NativeCreateAppDataTableSchemaResult,
  NativeFunctionMethod,
  NativeFunctionParams,
  NativeFunctionResult,
  NativeGetAppDataTableSchemaParams,
  NativeGetAppDataTableSchemaResult,
  NativeListActiveOAuthManagerTargetsParams,
  NativeListActiveOAuthManagerTargetsResult,
  NativeAppMediaUploadTarget,
  NativePrepareAppMediaUploadParams,
  NativeUpsertAppDataTableRowsParams,
  NativeUpsertAppDataTableRowsResult,
  NativeWriteUserChatPrivateNoteWithManagerCredentialParams,
  NativeWriteUserChatPrivateNoteWithManagerCredentialResult,
} from "@channel.io/app-sdk-core";
import type {
  NativeFunctionClientConfig,
  NativeFunctionCallOptions,
  NativeFunctionRequest,
  NativeFunctionResponse,
  IssueTokenParams,
  IssueTokenResult,
  RefreshTokenParams,
  NativeRegisterExtensionParams,
  NativeRegisterExtensionResult,
  NativeUnregisterExtensionParams,
  NativeUnregisterExtensionResult,
  GetAlfTaskVersionsParams,
  GetAlfTaskVersionsResult,
  GetAppNotebookVersionsParams,
  GetAppNotebookVersionsResult,
} from "./types.js";
import { ProxyApi } from "./proxy-api.js";
import { sanitizeForLogging } from "../utils/sanitize-for-logging.js";

/**
 * Default AppStore API URL
 */
const DEFAULT_APPSTORE_URL = "https://app-store-api.channel.io";
const CONTENT_SENSITIVE_NATIVE_METHODS = new Set(["writeUserChatPrivateNoteWithManagerCredential"]);

/**
 * HTTP transport client for Channel App platform native functions.
 *
 * Stateless — holds no app credentials. Callers are responsible for
 * supplying `appId`, `appSecret`, and `accessToken` at each call site,
 * which keeps token lifecycle management (caching, refresh) in the caller layer.
 * For built-in token caching and auto-refresh, use `TokenManager`.
 *
 * Most methods require a valid `accessToken` obtained via `issueToken()`.
 * `issueToken` and `refreshToken` share the same rate limit (10 calls / 30 min),
 * so callers should cache the token pair and prefer `refreshToken` on renewal.
 *
 * @example
 * ```typescript
 * import { NativeFunctionClient } from '@channel.io/app-sdk-server';
 *
 * const client = new NativeFunctionClient();
 *
 * // Issue a token (app-scoped)
 * const { accessToken, refreshToken, expiresIn } = await client.issueToken(APP_SECRET);
 *
 * // Register an extension and let AppStore discover command metadata
 * await client.registerExtension(APP_ID, "command", "v1", accessToken);
 * ```
 */
export class NativeFunctionClient {
  private readonly appStoreUrl: string;
  private readonly debug: boolean;

  constructor(config: NativeFunctionClientConfig = {}) {
    this.appStoreUrl = config.appStoreUrl ?? DEFAULT_APPSTORE_URL;
    this.debug = config.debug ?? false;
  }

  // ============================================
  // Auth Functions
  // ============================================

  /**
   * Issue an app-level or channel-scoped access token.
   *
   * Shares the same rate limit as `refreshToken` (10 calls / 30 min per app).
   * Cache the returned token pair and call `refreshToken` on renewal to avoid
   * burning this quota unnecessarily. If you want automatic caching and refresh,
   * prefer `TokenManager`.
   *
   * @param secret App secret (`APP_SECRET`)
   * @param options Pass `channelId` for a channel-scoped token; omit for app-scoped
   * @returns Token pair with `accessToken`, `refreshToken`, and `expiresIn` (seconds)
   */
  issueToken(secret: string, options?: { channelId?: string }): Promise<IssueTokenResult> {
    const params: IssueTokenParams = {
      secret,
      ...(options?.channelId && { channelId: options.channelId }),
    };

    return this.callNativeFunction<IssueTokenParams, IssueTokenResult>("issueToken", params);
  }

  /**
   * Renew an access token using a refresh token.
   *
   * Prefer this over `issueToken` on renewal — both share the same rate limit
   * (10 calls / 30 min), but `refreshToken` does not consume the app secret quota.
   *
   * @param refreshToken Refresh token from a previous `issueToken` or `refreshToken` call
   * @returns New token pair
   */
  refreshToken(refreshToken: string): Promise<IssueTokenResult> {
    const params: RefreshTokenParams = { refreshToken };

    return this.callNativeFunction<RefreshTokenParams, IssueTokenResult>("refreshToken", params);
  }

  // ============================================
  // Extension Functions
  // ============================================

  /**
   * Register an extension for the app
   *
   * @param appId App ID
   * @param extensionName Extension name (e.g., "calendar", "oauth")
   * @param systemVersion System version (e.g., "v1")
   * @param accessToken Access token (required for RBAC)
   * @returns Registration result
   */
  registerExtension(
    appId: string,
    extensionName: string,
    systemVersion: string,
    accessToken: string
  ): Promise<NativeRegisterExtensionResult> {
    const params: NativeRegisterExtensionParams = {
      appId,
      systemVersion,
      extensionName,
    };
    return this.callNativeFunctionWithToken<
      NativeRegisterExtensionParams,
      NativeRegisterExtensionResult
    >("registerExtension", params, accessToken);
  }

  /**
   * Unregister an extension for the app
   *
   * @param appId App ID
   * @param extensionName Extension name
   * @param systemVersion System version
   * @param accessToken Access token (required for RBAC)
   * @returns Unregistration result
   */
  unregisterExtension(
    appId: string,
    extensionName: string,
    systemVersion: string,
    accessToken: string
  ): Promise<NativeUnregisterExtensionResult> {
    const params: NativeUnregisterExtensionParams = {
      appId,
      systemVersion,
      extensionName,
    };
    return this.callNativeFunctionWithToken<
      NativeUnregisterExtensionParams,
      NativeUnregisterExtensionResult
    >("unregisterExtension", params, accessToken);
  }

  // ============================================
  // ALF Task Functions
  // ============================================

  /**
   * Get ALF task versions for the app
   *
   * @param appId App ID
   * @param accessToken Access token (required for RBAC)
   * @returns Task version list
   */
  getAlfTaskVersions(appId: string, accessToken: string): Promise<GetAlfTaskVersionsResult> {
    const params: GetAlfTaskVersionsParams = { appId };
    return this.callNativeFunctionWithToken<GetAlfTaskVersionsParams, GetAlfTaskVersionsResult>(
      "getAlfTaskVersions",
      params,
      accessToken
    );
  }

  // ============================================
  // App Notebook Functions
  // ============================================

  /**
   * Get app notebook versions for the app
   *
   * @param appId App ID
   * @param accessToken Access token (required for RBAC)
   * @returns Notebook version list
   */
  getAppNotebookVersions(
    appId: string,
    accessToken: string
  ): Promise<GetAppNotebookVersionsResult> {
    const params: GetAppNotebookVersionsParams = { appId };
    return this.callNativeFunctionWithToken<
      GetAppNotebookVersionsParams,
      GetAppNotebookVersionsResult
    >("getAppNotebookVersions", params, accessToken);
  }

  /**
   * Prepare a public Media upload for an app-owned file.
   *
   * Use a channel-scoped token. The returned target describes the authenticated
   * upload request that the caller must send directly to the Media service.
   */
  prepareAppMediaUpload(
    params: NativePrepareAppMediaUploadParams,
    accessToken: string
  ): Promise<NativeAppMediaUploadTarget> {
    return this.callNativeFunctionWithToken("prepareAppMediaUpload", params, accessToken);
  }

  // ============================================
  // AppDataTable Functions
  // ============================================

  /**
   * Create an app-owned logical data table.
   *
   * Call with an app-scoped access token. AppStore validates that the token owns
   * `params.appId`; callers should not pass dataset or project identifiers.
   */
  createAppDataTable(
    params: NativeCreateAppDataTableParams,
    accessToken: string
  ): Promise<NativeCreateAppDataTableResult> {
    return this.callNativeFunctionWithToken<
      NativeCreateAppDataTableParams,
      NativeCreateAppDataTableResult
    >("createAppDataTable", params, accessToken);
  }

  /**
   * Create or revise a tenant AppDataTable schema.
   *
   * Call with an app-scoped access token. `channelId` identifies the tenant data
   * boundary; AppStore authorizes the function with `params.appId`.
   */
  createAppDataTableSchema(
    params: NativeCreateAppDataTableSchemaParams,
    accessToken: string
  ): Promise<NativeCreateAppDataTableSchemaResult> {
    return this.callNativeFunctionWithToken<
      NativeCreateAppDataTableSchemaParams,
      NativeCreateAppDataTableSchemaResult
    >("createAppDataTableSchema", params, accessToken);
  }

  /**
   * Fetch the latest AppDataTable schema for a channel/app/table.
   *
   * Call with an app-scoped access token. `channelId` identifies the tenant data
   * boundary; AppStore authorizes the function with `params.appId`.
   */
  getAppDataTableSchema(
    params: NativeGetAppDataTableSchemaParams,
    accessToken: string
  ): Promise<NativeGetAppDataTableSchemaResult> {
    return this.callNativeFunctionWithToken<
      NativeGetAppDataTableSchemaParams,
      NativeGetAppDataTableSchemaResult
    >("getAppDataTableSchema", params, accessToken);
  }

  /**
   * Validate and enqueue rows for asynchronous AppDataTable ingestion.
   *
   * Call with an app-scoped access token. `channelId` identifies the tenant data
   * boundary; AppStore/Core validate that the target table belongs to `params.appId`.
   */
  upsertAppDataTableRows(
    params: NativeUpsertAppDataTableRowsParams,
    accessToken: string
  ): Promise<NativeUpsertAppDataTableRowsResult> {
    return this.callNativeFunctionWithToken<
      NativeUpsertAppDataTableRowsParams,
      NativeUpsertAppDataTableRowsResult
    >("upsertAppDataTableRows", params, accessToken);
  }

  /**
   * List active manager-scoped OAuth targets for this app.
   *
   * Use an app token from `TokenManager.getAppToken()` or one issued without a
   * `channelId`. Channel- and manager-scoped tokens are rejected.
   */
  listActiveOAuthManagerTargets(
    params: NativeListActiveOAuthManagerTargetsParams,
    accessToken: string
  ): Promise<NativeListActiveOAuthManagerTargetsResult> {
    return this.callNativeFunctionWithToken<
      NativeListActiveOAuthManagerTargetsParams,
      NativeListActiveOAuthManagerTargetsResult
    >("listActiveOAuthManagerTargets", params, accessToken);
  }

  /**
   * Write a private UserChat note as the exact Manager bound by a one-purpose credential.
   *
   * The credential is issued for one Channel, UserChat, Manager, request, and lifecycle
   * revision. It is passed as the native bearer token and must not be replaced with an
   * app- or Channel-scoped access token.
   */
  writeUserChatPrivateNoteWithManagerCredential(
    params: NativeWriteUserChatPrivateNoteWithManagerCredentialParams,
    managerCredential: string
  ): Promise<NativeWriteUserChatPrivateNoteWithManagerCredentialResult> {
    return this.callNativeFunctionWithToken(
      "writeUserChatPrivateNoteWithManagerCredential",
      params,
      managerCredential
    );
  }

  // ============================================
  // ProxyAPI (typed wrappers for core API)
  // ============================================

  /**
   * Create a typed ProxyAPI wrapper for Channel Talk core API functions.
   *
   * All proxy functions require a channel-scoped access token.
   * Use `issueToken(secret, { channelId })` to obtain one first.
   *
   * @param accessToken Channel-scoped access token
   * @returns Typed ProxyAPI instance
   *
   * @example
   * ```typescript
   * const { accessToken } = await client.issueToken(APP_SECRET, { channelId: 'ch-123' });
   * const api = client.createProxyApi(accessToken);
   *
   * const { message } = await api.writeGroupMessage({
   *   channelId: 'ch-123',
   *   groupId: 'group-456',
   *   dto: { plainText: 'Hello!' },
   * });
   * ```
   */
  createProxyApi(accessToken: string): ProxyApi {
    return new ProxyApi(this, accessToken);
  }

  // ============================================
  // Generic Function Calls
  // ============================================

  /**
   * Call any native function (no authentication required for public functions)
   *
   * @param method Function method name
   * @param params Function params
   * @returns Function result
   */
  async callNativeFunction<TMethod extends NativeFunctionMethod>(
    method: TMethod,
    params: NativeFunctionParams<TMethod>
  ): Promise<NativeFunctionResult<TMethod>>;
  async callNativeFunction<TParams, TResult>(method: string, params?: TParams): Promise<TResult>;
  async callNativeFunction<TParams, TResult>(method: string, params?: TParams): Promise<TResult> {
    const url = `${this.appStoreUrl}/general/v1/native/functions`;

    const request: NativeFunctionRequest<TParams> = {
      method,
      ...(params && { params }),
    };

    this.log(`Calling native function: ${method}`, params);

    const response = await fetch(url, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(request),
    });

    return this.handleResponse<TResult>(response, method);
  }

  /**
   * Call a native function with an RBAC access token.
   * Use this for native functions that require app-scoped or channel-scoped claims.
   *
   * @param method Function method name
   * @param params Function params
   * @param accessToken Access token
   * @returns Function result
   */
  async callNativeFunctionWithToken<TMethod extends NativeFunctionMethod>(
    method: TMethod,
    params: NativeFunctionParams<TMethod>,
    accessToken: string,
    options?: NativeFunctionCallOptions
  ): Promise<NativeFunctionResult<TMethod>>;
  async callNativeFunctionWithToken<TParams, TResult>(
    method: string,
    params: TParams,
    accessToken: string,
    options?: NativeFunctionCallOptions
  ): Promise<TResult>;
  async callNativeFunctionWithToken<TParams, TResult>(
    method: string,
    params: TParams,
    accessToken: string,
    options: NativeFunctionCallOptions = {}
  ): Promise<TResult> {
    const url = `${this.appStoreUrl}/general/v1/native/functions`;

    const request: NativeFunctionRequest<TParams> = {
      method,
      params,
    };

    this.log(
      `Calling native function with token: ${method}`,
      CONTENT_SENSITIVE_NATIVE_METHODS.has(method) ? undefined : params
    );

    const response = await fetch(url, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        "x-access-token": accessToken,
      },
      body: JSON.stringify(request),
      ...(options.signal && { signal: options.signal }),
    });

    return this.handleResponse<TResult>(response, method);
  }

  /**
   * Call an app function (function provided by another app or your own app)
   *
   * @param appId Target app ID
   * @param method Function method name
   * @param params Function params
   * @param context Function context
   * @param accessToken Access token
   * @param systemVersion System version (optional)
   * @returns Function result
   */
  async callAppFunction<TParams, TResult>(
    appId: string,
    method: string,
    params: TParams,
    context: Context,
    accessToken: string,
    systemVersion?: string
  ): Promise<TResult> {
    const url = `${this.appStoreUrl}/general/v1/apps/${encodeURIComponent(appId)}/functions`;

    const request: NativeFunctionRequest<TParams> = {
      method,
      params,
      context,
      ...(systemVersion && { systemVersion }),
    };

    this.log(`Calling app function: ${appId}/${method}`, { params, context });

    const response = await fetch(url, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        "x-access-token": accessToken,
      },
      body: JSON.stringify(request),
    });

    return this.handleResponse<TResult>(response, method);
  }

  /**
   * Handle API response
   */
  private async handleResponse<TResult>(response: Response, method: string): Promise<TResult> {
    if (!response.ok) {
      const errorBody = await response.text();
      throw new NativeFunctionError(
        `Native function call failed: ${response.status} ${response.statusText}`,
        response.status,
        errorBody
      );
    }

    const jsonResponse = (await response.json()) as NativeFunctionResponse<TResult>;

    if (jsonResponse.error) {
      throw new NativeFunctionError(
        jsonResponse.error.message,
        jsonResponse.error.code,
        JSON.stringify(jsonResponse.error.data)
      );
    }

    this.log(
      `${method} response`,
      CONTENT_SENSITIVE_NATIVE_METHODS.has(method) ? undefined : jsonResponse.result
    );

    return jsonResponse.result as TResult;
  }

  /**
   * Debug logging
   */
  private log(message: string, data?: unknown): void {
    if (this.debug) {
      if (data !== undefined) {
        console.debug(`[NativeFunctionClient] ${message}`, sanitizeForLogging(data));
      } else {
        console.debug(`[NativeFunctionClient] ${message}`);
      }
    }
  }
}

/**
 * Native function error
 */
export class NativeFunctionError extends Error {
  constructor(
    message: string,
    public readonly code?: number,
    public readonly responseBody?: string
  ) {
    super(message);
    this.name = "NativeFunctionError";
  }
}
