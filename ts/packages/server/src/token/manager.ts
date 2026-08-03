import type {
  TokenManagerConfig,
  TokenResponse,
  CachedToken,
  ChannelTokenRequest,
  TokenCacheStorage,
  TokenManagerLogger,
} from "./types.js";
import { InMemoryTokenCache } from "./cache.js";

const DEFAULT_REFRESH_BUFFER_MS = 5 * 60 * 1000;
const DEFAULT_APPSTORE_URL = "https://app-store.channel.io";
const DEFAULT_REQUEST_TIMEOUT_MS = 10_000;
const MAX_TOKEN_INVALIDATION_RETRIES = 2;

interface NativeTokenResponse {
  accessToken?: string;
  refreshToken?: string;
  expiresIn?: number;
}

interface NativeFunctionResponse<TResult = unknown> {
  result?: TResult;
  error?: {
    code?: number;
    message: string;
    data?: unknown;
  };
}

/**
 * Token manager for AppStore native function tokens.
 *
 * Handles app/channel token issuance, caching, automatic refresh, and
 * concurrent request deduplication. Token exchange is performed through
 * AppStore native `issueToken` / `refreshToken` using `PUT
 * /general/v1/native/functions`.
 */
export class TokenManager {
  private readonly appId: string;
  private readonly appSecret: string;
  private readonly appStoreUrl: string;
  private readonly refreshBufferMs: number;
  private readonly cache: TokenCacheStorage;
  private readonly debug: boolean;
  private readonly logger: TokenManagerLogger | undefined;
  private readonly inFlight = new Map<string, Promise<TokenResponse>>();
  private cacheGeneration = 0;

  constructor(config: TokenManagerConfig) {
    this.appId = config.appId;
    this.appSecret = config.appSecret;
    this.appStoreUrl = config.appStoreUrl ?? DEFAULT_APPSTORE_URL;
    this.refreshBufferMs = config.refreshBufferMs ?? DEFAULT_REFRESH_BUFFER_MS;
    this.cache = config.cacheStorage ?? new InMemoryTokenCache();
    this.debug = config.debug ?? false;
    this.logger = config.logger;
  }

  async getChannelToken(request: ChannelTokenRequest): Promise<TokenResponse> {
    const cacheKey = this.buildCacheKey("channel", request.channelId);
    return this.getOrRefreshToken(cacheKey, () => this.issueChannelToken(request));
  }

  async getAppToken(): Promise<TokenResponse> {
    const cacheKey = this.buildCacheKey("app");
    return this.getOrRefreshToken(cacheKey, () => this.issueAppToken());
  }

  async refreshToken(refreshToken: string): Promise<TokenResponse> {
    const response = await this.nativeFunctionRequest<NativeTokenResponse>("refreshToken", {
      refreshToken,
    });
    return this.normalizeTokenResponse(response);
  }

  async invalidateAppToken(): Promise<void> {
    await this.invalidateCacheKey(this.buildCacheKey("app"));
  }

  async invalidateChannelToken(channelId: string): Promise<void> {
    await this.invalidateCacheKey(this.buildCacheKey("channel", channelId));
  }

  private async invalidateCacheKey(cacheKey: string): Promise<void> {
    this.cacheGeneration++;
    this.inFlight.delete(cacheKey);
    await this.cache.delete(cacheKey);
  }

  async clearCache(): Promise<void> {
    this.cacheGeneration++;
    this.inFlight.clear();
    await this.cache.clear();
  }

  private async getOrRefreshToken(
    cacheKey: string,
    issueToken: () => Promise<TokenResponse>
  ): Promise<TokenResponse> {
    const cached = await this.cache.get(cacheKey);

    if (cached && !this.needsRefresh(cached)) {
      this.log(`Cache hit for ${cacheKey}`);
      return cached.token;
    }

    return this.dedup(cacheKey, () =>
      this.withCacheLock(cacheKey, () => this.getOrRefreshTokenWithRetry(cacheKey, issueToken))
    );
  }

  private async getOrRefreshTokenWithRetry(
    cacheKey: string,
    issueToken: () => Promise<TokenResponse>
  ): Promise<TokenResponse> {
    for (let attempt = 0; attempt <= MAX_TOKEN_INVALIDATION_RETRIES; attempt++) {
      const token = await this.getOrRefreshTokenOnce(cacheKey, issueToken);
      if (token) {
        return token;
      }

      if (attempt < MAX_TOKEN_INVALIDATION_RETRIES) {
        this.log(
          `Token invalidated while resolving ${cacheKey}; retrying ` +
            `(${attempt + 1}/${MAX_TOKEN_INVALIDATION_RETRIES})`
        );
      }
    }

    throw new TokenManagerError(
      `Token invalidated while resolving ${cacheKey}; retry limit exceeded`
    );
  }

  private async getOrRefreshTokenOnce(
    cacheKey: string,
    issueToken: () => Promise<TokenResponse>
  ): Promise<TokenResponse | null> {
    const latest = await this.cache.get(cacheKey);
    if (latest && !this.needsRefresh(latest)) {
      this.log(`Cache hit for ${cacheKey}`);
      return latest.token;
    }

    const generation = this.cacheGeneration;

    if (latest) {
      this.log(`Token expiring soon, refreshing for ${cacheKey}`);
      try {
        const refreshed = await this.refreshToken(latest.token.refreshToken);
        this.assertOutsideRefreshBuffer(refreshed, "Refreshed token");
        if (await this.cacheTokenIfCurrent(cacheKey, refreshed, generation)) {
          return refreshed;
        }
        this.log(`Token invalidated while refreshing for ${cacheKey}`);
        return null;
      } catch (error) {
        this.log(`Refresh failed, re-issuing token for ${cacheKey}`, this.sanitizeLogError(error));
        if (this.cacheGeneration !== generation) {
          this.log(`Token invalidated after refresh failure for ${cacheKey}`);
          return null;
        }
      }
    }

    this.log(`Issuing new token for ${cacheKey}`);
    const issued = await issueToken();
    const token = await this.refreshNewShortLivedToken(cacheKey, issued);
    if (await this.cacheTokenIfCurrent(cacheKey, token, generation)) {
      return token;
    }

    this.log(`Token invalidated while issuing for ${cacheKey}`);
    return null;
  }

  private needsRefresh(cached: CachedToken): boolean {
    return Date.now() >= cached.expiresAt - this.refreshBufferMs;
  }

  private isWithinRefreshBuffer(token: TokenResponse): boolean {
    return token.expiresIn * 1000 <= this.refreshBufferMs;
  }

  private assertOutsideRefreshBuffer(token: TokenResponse, source: string): void {
    if (this.isWithinRefreshBuffer(token)) {
      throw new TokenManagerError(
        `${source} expires within the configured refresh buffer (${String(token.expiresIn)}s)`
      );
    }
  }

  private async refreshNewShortLivedToken(
    cacheKey: string,
    token: TokenResponse
  ): Promise<TokenResponse> {
    if (!this.isWithinRefreshBuffer(token)) {
      return token;
    }

    this.log(`New token expires within refresh buffer, refreshing once for ${cacheKey}`);
    const refreshed = await this.refreshToken(token.refreshToken);
    this.assertOutsideRefreshBuffer(refreshed, "Token after immediate refresh");
    return refreshed;
  }

  private withCacheLock<T>(cacheKey: string, fn: () => Promise<T>): Promise<T> {
    if (this.cache.withLock) {
      return this.cache.withLock(cacheKey, fn);
    }
    return fn();
  }

  private async dedup(cacheKey: string, fn: () => Promise<TokenResponse>): Promise<TokenResponse> {
    const existing = this.inFlight.get(cacheKey);
    if (existing) {
      this.log(`Deduplicating concurrent request for ${cacheKey}`);
      return existing;
    }

    const promise = fn().finally(() => {
      this.inFlight.delete(cacheKey);
    });
    this.inFlight.set(cacheKey, promise);
    return promise;
  }

  private async issueChannelToken(request: ChannelTokenRequest): Promise<TokenResponse> {
    const response = await this.nativeFunctionRequest<NativeTokenResponse>("issueToken", {
      secret: this.appSecret,
      channelId: request.channelId,
    });
    return this.normalizeTokenResponse(response);
  }

  private async issueAppToken(): Promise<TokenResponse> {
    const response = await this.nativeFunctionRequest<NativeTokenResponse>("issueToken", {
      secret: this.appSecret,
    });
    return this.normalizeTokenResponse(response);
  }

  private async cacheToken(key: string, token: TokenResponse): Promise<void> {
    const expiresAt = Date.now() + token.expiresIn * 1000;
    const cached: CachedToken = {
      token,
      cachedAt: Date.now(),
      expiresAt,
      key,
    };
    const ttlMs = expiresAt - Date.now();
    await this.cache.set(key, cached, ttlMs > 0 ? ttlMs : undefined);
  }

  private async cacheTokenIfCurrent(
    key: string,
    token: TokenResponse,
    generation: number
  ): Promise<boolean> {
    if (this.cacheGeneration !== generation) {
      return false;
    }
    await this.cacheToken(key, token);
    return this.cacheGeneration === generation;
  }

  private buildCacheKey(type: "app" | "channel", channelId?: string): string {
    const parts = [this.appId, type];
    if (channelId) parts.push(channelId);
    return parts.join(":");
  }

  private async nativeFunctionRequest<TResult>(
    method: string,
    params: Record<string, unknown>
  ): Promise<TResult> {
    const url = `${this.appStoreUrl}/general/v1/native/functions`;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), DEFAULT_REQUEST_TIMEOUT_MS);
    let response: Response;

    try {
      response = await fetch(url, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ method, params }),
        signal: controller.signal,
      });
    } finally {
      clearTimeout(timeout);
    }

    if (!response.ok) {
      const errorBody = await response.text();
      throw new TokenManagerError(
        `Native function token request failed: ${String(response.status)} ${response.statusText}`,
        response.status,
        errorBody
      );
    }

    const body = (await response.json()) as NativeFunctionResponse<TResult>;
    if (body.error) {
      throw new TokenManagerError(
        body.error.message,
        body.error.code,
        JSON.stringify(body.error.data)
      );
    }

    return body.result as TResult;
  }

  private normalizeTokenResponse(response: NativeTokenResponse | undefined): TokenResponse {
    if (
      !response ||
      typeof response.accessToken !== "string" ||
      response.accessToken.length === 0 ||
      typeof response.refreshToken !== "string" ||
      response.refreshToken.length === 0 ||
      typeof response.expiresIn !== "number" ||
      !Number.isFinite(response.expiresIn) ||
      response.expiresIn <= 0
    ) {
      throw new TokenManagerError(
        "Invalid native token response",
        undefined,
        JSON.stringify(response)
      );
    }

    return {
      accessToken: response.accessToken,
      refreshToken: response.refreshToken,
      expiresIn: response.expiresIn,
    };
  }

  private log(message: string, error?: unknown): void {
    if (!this.debug || !this.logger) {
      return;
    }

    if (error) {
      this.logger.debug(message, error);
    } else {
      this.logger.debug(message);
    }
  }

  private sanitizeLogError(error: unknown): unknown {
    if (error instanceof TokenManagerError) {
      return {
        name: error.name,
        message: error.message,
        statusCode: error.statusCode,
      };
    }

    if (error instanceof Error) {
      return {
        name: error.name,
        message: error.message,
      };
    }

    return { message: String(error) };
  }

  destroy(): void {
    if (this.cache instanceof InMemoryTokenCache) {
      this.cache.destroy();
    }
  }
}

export class TokenManagerError extends Error {
  constructor(
    message: string,
    public readonly statusCode?: number,
    public readonly responseBody?: string
  ) {
    super(message);
    this.name = "TokenManagerError";
  }
}
