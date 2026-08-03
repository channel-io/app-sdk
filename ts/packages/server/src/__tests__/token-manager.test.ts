import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { TokenManager, TokenManagerError } from "../token/manager.js";
import { InMemoryTokenCache } from "../token/cache.js";
import type {
  CachedToken,
  TokenCacheStorage,
  TokenManagerConfig,
  TokenResponse,
} from "../token/types.js";

function makeTokenResponse(overrides: Partial<TokenResponse> = {}): TokenResponse {
  return {
    accessToken: overrides.accessToken ?? "access-token",
    refreshToken: overrides.refreshToken ?? "refresh-token",
    expiresIn: overrides.expiresIn ?? 3600,
  };
}

function makeNativeFunctionResponse(overrides: Partial<TokenResponse> = {}) {
  return {
    result: {
      accessToken: overrides.accessToken ?? "access-token",
      refreshToken: overrides.refreshToken ?? "refresh-token",
      expiresIn: overrides.expiresIn ?? 3600,
    },
  };
}

function createResponse(body: unknown, ok = true, status = 200): Response {
  return {
    ok,
    status,
    statusText: ok ? "OK" : "Error",
    json: async () => body,
    text: async () => JSON.stringify(body),
  } as unknown as Response;
}

function createMockFetch(responses: Array<{ ok: boolean; status: number; body: unknown }>) {
  let callIndex = 0;
  return vi.fn(async () => {
    const resp = (responses[callIndex] ?? responses[responses.length - 1])!;
    callIndex++;
    return createResponse(resp.body, resp.ok, resp.status);
  });
}

function getRequest(index: number): { method: string; params: Record<string, unknown> } {
  const call = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[index]!;
  return JSON.parse((call[1] as RequestInit).body as string) as {
    method: string;
    params: Record<string, unknown>;
  };
}

class SharedLockingTokenCache implements TokenCacheStorage {
  private readonly entries = new Map<string, { token: CachedToken; expiresAt: number }>();
  private readonly lockTails = new Map<string, Promise<void>>();

  async get(key: string): Promise<CachedToken | null> {
    const entry = this.entries.get(key);
    if (!entry) return null;
    if (Date.now() >= entry.expiresAt) {
      this.entries.delete(key);
      return null;
    }
    return entry.token;
  }

  async set(key: string, token: CachedToken, ttlMs?: number): Promise<void> {
    this.entries.set(key, {
      token,
      expiresAt: ttlMs === undefined ? token.expiresAt : Date.now() + ttlMs,
    });
  }

  async delete(key: string): Promise<void> {
    this.entries.delete(key);
  }

  async clear(): Promise<void> {
    this.entries.clear();
  }

  async withLock<T>(key: string, callback: () => Promise<T>): Promise<T> {
    const previous = this.lockTails.get(key) ?? Promise.resolve();
    let release: () => void = () => undefined;
    const current = new Promise<void>((resolve) => {
      release = resolve;
    });
    const tail = previous.then(() => current);
    this.lockTails.set(key, tail);

    await previous;
    try {
      return await callback();
    } finally {
      release();
      if (this.lockTails.get(key) === tail) {
        this.lockTails.delete(key);
      }
    }
  }
}

describe("InMemoryTokenCache", () => {
  let cache: InMemoryTokenCache;

  beforeEach(() => {
    vi.useFakeTimers();
    cache = new InMemoryTokenCache(60000);
  });

  afterEach(() => {
    cache.destroy();
    vi.useRealTimers();
  });

  it("stores, retrieves, expires, deletes, and clears cached tokens", async () => {
    const token = makeTokenResponse();
    const cached: CachedToken = {
      token,
      cachedAt: Date.now(),
      expiresAt: Date.now() + token.expiresIn * 1000,
      key: "key",
    };

    expect(await cache.get("key")).toBeNull();

    await cache.set("key", cached, 5000);
    expect((await cache.get("key"))?.token.accessToken).toBe("access-token");

    vi.advanceTimersByTime(6000);
    expect(await cache.get("key")).toBeNull();

    await cache.set("key", cached, 0);
    expect(await cache.get("key")).toBeNull();

    await cache.set("key", cached);
    await cache.delete("key");
    expect(await cache.get("key")).toBeNull();

    await cache.set("a", {
      token,
      cachedAt: Date.now(),
      expiresAt: cached.expiresAt,
      key: "a",
    });
    await cache.set("b", {
      token,
      cachedAt: Date.now(),
      expiresAt: cached.expiresAt,
      key: "b",
    });
    expect(cache.getStats().size).toBe(2);
    await cache.clear();
    expect(cache.getStats().size).toBe(0);
  });
});

describe("TokenManager", () => {
  let originalFetch: typeof globalThis.fetch;

  beforeEach(() => {
    vi.useFakeTimers();
    originalFetch = globalThis.fetch;
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    vi.useRealTimers();
  });

  function createManager(overrides: Partial<TokenManagerConfig> = {}) {
    return new TokenManager({
      appId: "test-app",
      appSecret: "test-secret",
      ...overrides,
    });
  }

  it("issues app and channel tokens through AppStore native functions using PUT", async () => {
    globalThis.fetch = createMockFetch([
      { ok: true, status: 200, body: makeNativeFunctionResponse({ accessToken: "app-token" }) },
      { ok: true, status: 200, body: makeNativeFunctionResponse({ accessToken: "channel-token" }) },
    ]);
    const manager = createManager();

    const appToken = await manager.getAppToken();
    const channelToken = await manager.getChannelToken({ channelId: "ch-1" });

    expect(appToken).toEqual({
      accessToken: "app-token",
      refreshToken: "refresh-token",
      expiresIn: 3600,
    });
    expect(channelToken).toEqual({
      accessToken: "channel-token",
      refreshToken: "refresh-token",
      expiresIn: 3600,
    });

    const calls = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls;
    expect(calls[0]![0]).toBe("https://app-store.channel.io/general/v1/native/functions");
    expect((calls[0]![1] as RequestInit).method).toBe("PUT");
    expect(getRequest(0)).toEqual({
      method: "issueToken",
      params: { secret: "test-secret" },
    });
    expect(getRequest(1)).toEqual({
      method: "issueToken",
      params: { secret: "test-secret", channelId: "ch-1" },
    });

    manager.destroy();
  });

  it("uses cached tokens until they enter the refresh buffer", async () => {
    globalThis.fetch = createMockFetch([
      { ok: true, status: 200, body: makeNativeFunctionResponse() },
      {
        ok: true,
        status: 200,
        body: makeNativeFunctionResponse({ accessToken: "refreshed-token" }),
      },
    ]);
    const manager = createManager();

    await manager.getChannelToken({ channelId: "ch-1" });
    const cached = await manager.getChannelToken({ channelId: "ch-1" });
    expect(cached.accessToken).toBe("access-token");
    expect(globalThis.fetch).toHaveBeenCalledTimes(1);

    vi.advanceTimersByTime(56 * 60 * 1000);
    const refreshed = await manager.getChannelToken({ channelId: "ch-1" });
    expect(refreshed.accessToken).toBe("refreshed-token");
    expect(globalThis.fetch).toHaveBeenCalledTimes(2);
    expect(getRequest(1)).toEqual({
      method: "refreshToken",
      params: { refreshToken: "refresh-token" },
    });

    manager.destroy();
  });

  it("refreshes a newly issued short-lived token before returning it", async () => {
    globalThis.fetch = createMockFetch([
      {
        ok: true,
        status: 200,
        body: makeNativeFunctionResponse({
          accessToken: "short-token",
          refreshToken: "short-refresh-token",
          expiresIn: 300,
        }),
      },
      {
        ok: true,
        status: 200,
        body: makeNativeFunctionResponse({
          accessToken: "refreshed-token",
          refreshToken: "refreshed-refresh-token",
          expiresIn: 3600,
        }),
      },
    ]);
    const manager = createManager();

    await expect(manager.getAppToken()).resolves.toMatchObject({
      accessToken: "refreshed-token",
    });
    await expect(manager.getAppToken()).resolves.toMatchObject({
      accessToken: "refreshed-token",
    });
    expect(globalThis.fetch).toHaveBeenCalledTimes(2);
    expect(getRequest(0).method).toBe("issueToken");
    expect(getRequest(1)).toEqual({
      method: "refreshToken",
      params: { refreshToken: "short-refresh-token" },
    });

    manager.destroy();
  });

  it("rejects a token that remains within the refresh buffer after one refresh", async () => {
    globalThis.fetch = createMockFetch([
      { ok: true, status: 200, body: makeNativeFunctionResponse({ expiresIn: 60 }) },
      { ok: true, status: 200, body: makeNativeFunctionResponse({ expiresIn: 60 }) },
    ]);
    const manager = createManager();

    await expect(manager.getAppToken()).rejects.toThrow(
      "Token after immediate refresh expires within the configured refresh buffer"
    );
    expect(globalThis.fetch).toHaveBeenCalledTimes(2);

    manager.destroy();
  });

  it("re-issues when refreshing a cached token still returns a short lifetime", async () => {
    globalThis.fetch = createMockFetch([
      { ok: true, status: 200, body: makeNativeFunctionResponse() },
      { ok: true, status: 200, body: makeNativeFunctionResponse({ expiresIn: 60 }) },
      {
        ok: true,
        status: 200,
        body: makeNativeFunctionResponse({ accessToken: "reissued-token" }),
      },
    ]);
    const manager = createManager();

    await manager.getAppToken();
    vi.advanceTimersByTime(56 * 60 * 1000);
    await expect(manager.getAppToken()).resolves.toMatchObject({ accessToken: "reissued-token" });
    expect(getRequest(1).method).toBe("refreshToken");
    expect(getRequest(2).method).toBe("issueToken");

    manager.destroy();
  });

  it("falls back to issueToken when refreshToken fails", async () => {
    globalThis.fetch = createMockFetch([
      { ok: true, status: 200, body: makeNativeFunctionResponse() },
      { ok: true, status: 200, body: { error: { code: 401, message: "Unauthorized" } } },
      {
        ok: true,
        status: 200,
        body: makeNativeFunctionResponse({ accessToken: "reissued-token" }),
      },
    ]);
    const manager = createManager();

    await manager.getAppToken();
    vi.advanceTimersByTime(56 * 60 * 1000);
    const token = await manager.getAppToken();

    expect(token.accessToken).toBe("reissued-token");
    expect(getRequest(0).method).toBe("issueToken");
    expect(getRequest(1).method).toBe("refreshToken");
    expect(getRequest(2).method).toBe("issueToken");

    manager.destroy();
  });

  it("deduplicates concurrent requests for the same cache key", async () => {
    globalThis.fetch = vi.fn(
      () =>
        new Promise<Response>((resolve) => {
          setTimeout(() => {
            resolve(createResponse(makeNativeFunctionResponse()));
          }, 100);
        })
    );
    const manager = createManager();

    const p1 = manager.getChannelToken({ channelId: "ch-1" });
    const p2 = manager.getChannelToken({ channelId: "ch-1" });

    await vi.advanceTimersByTimeAsync(100);
    const [r1, r2] = await Promise.all([p1, p2]);

    expect(r1.accessToken).toBe("access-token");
    expect(r2.accessToken).toBe("access-token");
    expect(globalThis.fetch).toHaveBeenCalledTimes(1);

    manager.destroy();
  });

  it("deduplicates issuance across managers when shared storage provides a lock", async () => {
    const storage = new SharedLockingTokenCache();
    globalThis.fetch = createMockFetch([
      { ok: true, status: 200, body: makeNativeFunctionResponse() },
    ]);
    const manager1 = createManager({ cacheStorage: storage });
    const manager2 = createManager({ cacheStorage: storage });

    const [token1, token2] = await Promise.all([
      manager1.getChannelToken({ channelId: "ch-1" }),
      manager2.getChannelToken({ channelId: "ch-1" }),
    ]);

    expect(token1.accessToken).toBe("access-token");
    expect(token2.accessToken).toBe("access-token");
    expect(globalThis.fetch).toHaveBeenCalledTimes(1);

    manager1.destroy();
    manager2.destroy();
  });

  it("retries instead of returning an issued token invalidated during the request", async () => {
    let requestCount = 0;
    globalThis.fetch = vi.fn(
      () =>
        new Promise<Response>((resolve) => {
          requestCount++;
          const accessToken = requestCount === 1 ? "stale-token" : "fresh-token";
          const response = createResponse(makeNativeFunctionResponse({ accessToken }));
          if (requestCount === 1) {
            setTimeout(() => resolve(response), 100);
          } else {
            resolve(response);
          }
        })
    );
    const manager = createManager();

    const tokenPromise = manager.getAppToken();
    await Promise.resolve();
    await Promise.resolve();
    expect(globalThis.fetch).toHaveBeenCalledTimes(1);

    await vi.advanceTimersByTimeAsync(50);
    await manager.invalidateAppToken();
    await vi.advanceTimersByTimeAsync(100);

    await expect(tokenPromise).resolves.toMatchObject({ accessToken: "fresh-token" });
    expect(globalThis.fetch).toHaveBeenCalledTimes(2);

    manager.destroy();
  });

  it("fails when token issuance keeps getting invalidated past the retry limit", async () => {
    globalThis.fetch = vi.fn(
      () =>
        new Promise<Response>((resolve) => {
          setTimeout(() => {
            resolve(createResponse(makeNativeFunctionResponse({ accessToken: "stale-token" })));
          }, 100);
        })
    );
    const manager = createManager();

    async function invalidateActiveRequest(): Promise<void> {
      await Promise.resolve();
      await Promise.resolve();
      await vi.advanceTimersByTimeAsync(50);
      await manager.invalidateAppToken();
      await vi.advanceTimersByTimeAsync(50);
      await Promise.resolve();
      await Promise.resolve();
    }

    const tokenPromise = manager.getAppToken();
    await invalidateActiveRequest();
    await invalidateActiveRequest();

    const rejection = expect(tokenPromise).rejects.toThrow("retry limit exceeded");
    await invalidateActiveRequest();
    await rejection;
    expect(globalThis.fetch).toHaveBeenCalledTimes(3);

    manager.destroy();
  });

  it("retries instead of returning a refreshed token invalidated during the request", async () => {
    let issueCount = 0;
    globalThis.fetch = vi.fn((_url, init) => {
      const request = JSON.parse((init as RequestInit).body as string) as {
        method: string;
      };

      if (request.method === "refreshToken") {
        return new Promise<Response>((resolve) => {
          setTimeout(() => {
            resolve(
              createResponse(
                makeNativeFunctionResponse({
                  accessToken: "stale-refreshed-token",
                  refreshToken: "stale-refresh-token",
                })
              )
            );
          }, 100);
        });
      }

      issueCount++;
      const response =
        issueCount === 1
          ? makeNativeFunctionResponse({
              accessToken: "old-token",
              refreshToken: "old-refresh-token",
            })
          : makeNativeFunctionResponse({
              accessToken: "fresh-token",
              refreshToken: "fresh-refresh-token",
            });
      return Promise.resolve(createResponse(response));
    });
    const manager = createManager();

    await expect(manager.getAppToken()).resolves.toMatchObject({ accessToken: "old-token" });
    vi.advanceTimersByTime(56 * 60 * 1000);

    const tokenPromise = manager.getAppToken();
    await Promise.resolve();
    await Promise.resolve();
    expect(globalThis.fetch).toHaveBeenCalledTimes(2);

    await vi.advanceTimersByTimeAsync(50);
    await manager.invalidateAppToken();
    await vi.advanceTimersByTimeAsync(100);

    await expect(tokenPromise).resolves.toMatchObject({ accessToken: "fresh-token" });
    expect(globalThis.fetch).toHaveBeenCalledTimes(3);
    expect(getRequest(1).method).toBe("refreshToken");
    expect(getRequest(2).method).toBe("issueToken");

    manager.destroy();
  });

  it("invalidates and clears cached tokens", async () => {
    globalThis.fetch = createMockFetch([
      { ok: true, status: 200, body: makeNativeFunctionResponse({ accessToken: "token-1" }) },
      { ok: true, status: 200, body: makeNativeFunctionResponse({ accessToken: "token-2" }) },
      { ok: true, status: 200, body: makeNativeFunctionResponse({ accessToken: "token-3" }) },
      { ok: true, status: 200, body: makeNativeFunctionResponse({ accessToken: "token-4" }) },
      { ok: true, status: 200, body: makeNativeFunctionResponse({ accessToken: "token-5" }) },
    ]);
    const manager = createManager();

    await manager.getChannelToken({ channelId: "ch-1" });
    await manager.invalidateChannelToken("ch-1");
    expect((await manager.getChannelToken({ channelId: "ch-1" })).accessToken).toBe("token-2");

    await manager.getAppToken();
    await manager.invalidateAppToken();
    expect((await manager.getAppToken()).accessToken).toBe("token-4");

    await manager.clearCache();
    expect((await manager.getAppToken()).accessToken).toBe("token-5");

    manager.destroy();
  });

  it("does not log token-bearing native error bodies", async () => {
    const logger = { debug: vi.fn() };
    globalThis.fetch = createMockFetch([
      { ok: true, status: 200, body: makeNativeFunctionResponse() },
      {
        ok: true,
        status: 200,
        body: {
          error: {
            code: 401,
            message: "Unauthorized",
            data: {
              accessToken: "secret-access-token",
              refreshToken: "secret-refresh-token",
            },
          },
        },
      },
      {
        ok: true,
        status: 200,
        body: makeNativeFunctionResponse({ accessToken: "reissued-token" }),
      },
    ]);
    const manager = createManager({ debug: true, logger });

    await manager.getAppToken();
    vi.advanceTimersByTime(56 * 60 * 1000);
    await manager.getAppToken();

    const logPayload = JSON.stringify(logger.debug.mock.calls);
    expect(logPayload).toContain("Unauthorized");
    expect(logPayload).not.toContain("secret-access-token");
    expect(logPayload).not.toContain("secret-refresh-token");

    manager.destroy();
  });

  it("times out hung native function requests and clears in-flight state", async () => {
    globalThis.fetch = vi
      .fn()
      .mockImplementationOnce((_url, init) => {
        return new Promise<Response>((_resolve, reject) => {
          const signal = (init as RequestInit).signal;
          signal?.addEventListener("abort", () => {
            const error = new Error("The operation was aborted.");
            error.name = "AbortError";
            reject(error);
          });
        });
      })
      .mockResolvedValueOnce(
        createResponse(makeNativeFunctionResponse({ accessToken: "after-timeout" }))
      );
    const manager = createManager();

    const timedOut = manager.getAppToken();
    await Promise.resolve();
    await Promise.resolve();
    const rejection = expect(timedOut).rejects.toMatchObject({ name: "AbortError" });
    await vi.advanceTimersByTimeAsync(10_000);

    await rejection;
    await expect(manager.getAppToken()).resolves.toMatchObject({ accessToken: "after-timeout" });
    expect(globalThis.fetch).toHaveBeenCalledTimes(2);

    manager.destroy();
  });

  it("throws TokenManagerError for transport and native function errors", async () => {
    globalThis.fetch = createMockFetch([{ ok: false, status: 500, body: "server error" }]);
    const manager = createManager();
    await expect(manager.getAppToken()).rejects.toThrow(TokenManagerError);
    manager.destroy();

    globalThis.fetch = createMockFetch([
      { ok: true, status: 200, body: { error: { code: 401, message: "Unauthorized" } } },
    ]);
    const errorManager = createManager();
    await expect(errorManager.getAppToken()).rejects.toThrow(TokenManagerError);
    errorManager.destroy();

    globalThis.fetch = createMockFetch([
      {
        ok: true,
        status: 200,
        body: { result: { refreshToken: "refresh-token", expiresIn: 3600 } },
      },
    ]);
    const invalidResponseManager = createManager();
    await expect(invalidResponseManager.getAppToken()).rejects.toThrow(
      "Invalid native token response"
    );
    invalidResponseManager.destroy();
  });

  it("uses custom AppStore URL and cache storage", async () => {
    const storage = new InMemoryTokenCache();
    globalThis.fetch = createMockFetch([
      { ok: true, status: 200, body: makeNativeFunctionResponse() },
    ]);
    const manager = createManager({
      appStoreUrl: "https://app-store.example.com",
      cacheStorage: storage,
    });

    await manager.getAppToken();

    expect((globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0]![0]).toBe(
      "https://app-store.example.com/general/v1/native/functions"
    );
    expect(storage.getStats().keys).toEqual(["test-app:app"]);

    manager.destroy();
    storage.destroy();
  });
});
