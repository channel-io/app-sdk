import type { DynamicModule, Type, ForwardReference, InjectionToken } from "@nestjs/common";
import type { TokenCacheStorage } from "../token/types.js";

/**
 * Configuration options for ChannelAppModule
 */
export interface ChannelAppModuleOptions {
  /** Your app's ID from Channel.io */
  appId: string;
  /** Your app's secret from Channel.io */
  appSecret: string;
  /** Whether to enable debug logging (default: false) */
  debug?: boolean;
  /**
   * Automatically register extensions with AppStore on module init
   * When true, calls registerExtension API for each extension
   * @default false
   */
  autoRegister?: boolean;
  /**
   * Maximum auto-registration attempts. Transient app-server/AppStore
   * startup failures are retried with exponential backoff.
   * @default 3
   */
  autoRegisterMaxAttempts?: number;
  /**
   * Initial auto-registration retry backoff in milliseconds.
   * @default 1000
   */
  autoRegisterInitialBackoffMs?: number;
  /**
   * Maximum auto-registration retry backoff in milliseconds.
   * @default 5000
   */
  autoRegisterMaxBackoffMs?: number;
  /**
   * AppStore API URL (default: https://app-store-api.channel.io)
   */
  appStoreUrl?: string;
  /**
   * Custom token cache storage for the shared TokenManager.
   * Use this for multi-instance deployments (Redis, database, etc.).
   */
  tokenCacheStorage?: TokenCacheStorage;
  /**
   * Buffer time before token expiry to trigger refresh (default: 5 minutes).
   */
  tokenRefreshBufferMs?: number;
  /**
   * Callback invoked after extension registration completes.
   * Useful for logging or error handling.
   */
  onAutoRegister?: (results: AutoRegisterResult[]) => void;
  /**
   * Signing key for verifying X-Signature header (hex-encoded)
   * If not provided, appSecret will be used
   * This should be the 64-character hex string from your app settings
   */
  signingKey?: string;
  /**
   * Skip signature verification (for development/testing only)
   * WARNING: Never enable this in production!
   * @default false
   */
  skipSignatureVerification?: boolean;
}

/**
 * Result of auto-registration for a single extension
 */
export interface AutoRegisterResult {
  extensionName: string;
  systemVersion: string;
  success: boolean;
  error?: string;
}

/**
 * Module import type for NestJS
 */
type ModuleImport = Type | DynamicModule | Promise<DynamicModule> | ForwardReference;

/**
 * Async configuration options for ChannelAppModule
 */
export interface ChannelAppModuleAsyncOptions {
  /** Factory function that returns module options */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  useFactory: (...args: any[]) => Promise<ChannelAppModuleOptions> | ChannelAppModuleOptions;
  /** Dependencies to inject into the factory */
  inject?: InjectionToken[];
  /** Modules to import */
  imports?: ModuleImport[];
}

/**
 * Injection token for module options
 */
export const CHANNEL_APP_OPTIONS = Symbol("CHANNEL_APP_OPTIONS");
