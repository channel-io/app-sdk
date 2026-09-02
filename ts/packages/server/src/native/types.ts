/**
 * Native Function types for Channel App platform
 *
 * This module contains types for AppStore native functions.
 * Some public native functions still require app-scoped or channel-scoped RBAC tokens.
 */

/**
 * Native function client configuration
 */
export interface NativeFunctionClientConfig {
  /** AppStore API base URL (default: https://app-store-api.channel.io) */
  appStoreUrl?: string | undefined;
  /** Enable debug logging */
  debug?: boolean | undefined;
}

/** Per-call transport controls for a native function invocation. */
export interface NativeFunctionCallOptions {
  /** Cancels the underlying HTTP request when aborted. */
  signal?: AbortSignal | undefined;
}

import type { Context } from "@channel.io/app-sdk-core";

/**
 * Native function request
 */
export interface NativeFunctionRequest<TParams = unknown> {
  method: string;
  params?: TParams;
  context?: Context;
  systemVersion?: string;
}

/**
 * Native function response
 */
export interface NativeFunctionResponse<TResult = unknown> {
  result?: TResult;
  error?: NativeFunctionErrorResponse;
}

/**
 * Native function error response structure
 */
export interface NativeFunctionErrorResponse {
  code: number;
  message: string;
  data?: unknown;
  type?: string;
}

// ============================================
// Auth Functions (PUBLIC)
// ============================================

/**
 * Issue token params
 */
export interface IssueTokenParams {
  secret: string;
  channelId?: string;
}

/**
 * Issue token result
 */
export interface IssueTokenResult {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

/**
 * Refresh token params
 */
export interface RefreshTokenParams {
  refreshToken: string;
}

// ============================================
// Extension Functions (PUBLIC)
// ============================================

/**
 * Register extension params (native function, camelCase)
 */
export interface NativeRegisterExtensionParams {
  /** App ID */
  appId: string;
  /** System version (e.g., "v1") */
  systemVersion: string;
  /** Extension name (e.g., "calendar", "oauth") */
  extensionName: string;
}

/**
 * Extension info returned from native registration
 */
export interface NativeExtensionInfo {
  /** Extension name */
  name: string;
  /** System version */
  systemVersion: string;
  /** Whether exclusive */
  exclusive?: boolean;
}

/**
 * Register extension result (native function, camelCase)
 */
export interface NativeRegisterExtensionResult {
  /** Whether registration succeeded */
  success: boolean;
  /** Error message if failed */
  errorMessage?: string;
  /** Registered extensions */
  extensions?: NativeExtensionInfo[];
  /** Validation errors */
  validationErrors?: string[];
}

/**
 * Unregister extension params (native function, camelCase)
 */
export interface NativeUnregisterExtensionParams {
  /** App ID */
  appId: string;
  /** System version (e.g., "v1") */
  systemVersion: string;
  /** Extension name */
  extensionName: string;
}

/**
 * Unregister extension result (native function, camelCase)
 */
export interface NativeUnregisterExtensionResult {
  /** Whether unregistration succeeded */
  success: boolean;
  /** Error message if failed */
  errorMessage?: string;
}

// ============================================
// ALF Task Functions (PUBLIC)
// ============================================

/**
 * Get ALF task versions params
 */
export interface GetAlfTaskVersionsParams {
  /** App ID */
  appId: string;
}

/**
 * ALF task version info
 */
export interface AlfTaskVersion {
  /** Task ID */
  id: string;
  /** Task name */
  name: string;
  /** Task version */
  version: string;
}

/**
 * Get ALF task versions result
 */
export interface GetAlfTaskVersionsResult {
  /** Whether request succeeded */
  success: boolean;
  /** Error message if failed */
  errorMessage?: string;
  /** Task version list */
  tasks: AlfTaskVersion[];
}

// ============================================
// App Notebook Functions (PUBLIC)
// ============================================

/**
 * Get app notebook versions params
 */
export interface GetAppNotebookVersionsParams {
  /** App ID */
  appId: string;
}

/**
 * App notebook version info
 */
export interface AppNotebookVersion {
  /** Stable app-scoped notebook key */
  notebookKey: string;
  /** Developer-managed notebook version */
  version: number;
  /** Latest Notebook service revision ID */
  latestRevisionId?: string;
  /** Latest update timestamp */
  updatedAt?: string;
}

/**
 * Get app notebook versions result
 */
export interface GetAppNotebookVersionsResult {
  /** Whether request succeeded */
  success: boolean;
  /** Error message if failed */
  errorMessage?: string;
  /** Notebook version list */
  notebooks: AppNotebookVersion[];
}
