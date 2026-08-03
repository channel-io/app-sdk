/**
 * Token types and interfaces for Channel.io App SDK
 */

/**
 * Token response from AppStore native issueToken / refreshToken.
 */
export interface TokenResponse {
  /** Access token for API calls */
  accessToken: string;
  /** Refresh token for token renewal */
  refreshToken: string;
  /** Token expiration time in seconds */
  expiresIn: number;
}

/**
 * Cached token entry with metadata
 */
export interface CachedToken {
  /** The token response */
  token: TokenResponse;
  /** When this cache entry was created */
  cachedAt: number;
  /** Access token expiration timestamp derived by the SDK (Unix milliseconds) */
  expiresAt: number;
  /** Cache key identifier */
  key: string;
}

/**
 * Token cache storage interface
 * Implement this to use custom storage (Redis, database, etc.)
 */
export interface TokenCacheStorage {
  /** Get a cached token by key */
  get(key: string): Promise<CachedToken | null>;
  /** Set a cached token */
  set(key: string, token: CachedToken, ttlMs?: number): Promise<void>;
  /** Delete a cached token */
  delete(key: string): Promise<void>;
  /** Clear all cached tokens */
  clear(): Promise<void>;
  /**
   * Optionally serialize token resolution for a cache key across replicas.
   * The callback must run exactly once while the storage-backed lock is held.
   */
  withLock?<T>(key: string, callback: () => Promise<T>): Promise<T>;
}

/**
 * Logger interface accepted by TokenManager.
 */
export interface TokenManagerLogger {
  debug(message: string, ...optionalParams: unknown[]): void;
}

/**
 * Token manager configuration
 */
export interface TokenManagerConfig {
  /** App ID */
  appId: string;
  /** App secret */
  appSecret: string;
  /** AppStore API base URL (default: https://app-store.channel.io) */
  appStoreUrl?: string;
  /** Custom cache storage (default: in-memory) */
  cacheStorage?: TokenCacheStorage;
  /** Buffer time before expiry to trigger refresh (default: 5 minutes) */
  refreshBufferMs?: number;
  /** Enable debug logging */
  debug?: boolean;
  /** Logger used when debug logging is enabled */
  logger?: TokenManagerLogger;
}

/**
 * Token request for issuing channel token
 */
export interface ChannelTokenRequest {
  channelId: string;
}
