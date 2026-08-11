import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import type { HttpAdapterHost } from "@nestjs/core";
import { FunctionCallNotFoundError, FunctionNotFoundError } from "@channel.io/app-sdk-core";
import { ChannelAppService, VersionMismatchError } from "./channel-app.service.js";
import type { ChannelAppModuleOptions } from "./types.js";
import type { ExtensionDiscoveryService } from "../discovery/extension-discovery.service.js";
import type { ExtensionMetadata, FunctionMetadata } from "../discovery/metadata.interface.js";

// Mock NativeFunctionClient
vi.mock("../native/client.js", () => {
  return {
    NativeFunctionClient: vi.fn().mockImplementation(() => ({
      issueToken: vi.fn().mockResolvedValue({
        accessToken: "mock-access-token",
        refreshToken: "mock-refresh-token",
        expiresIn: 3600,
      }),
      refreshToken: vi.fn().mockResolvedValue({
        accessToken: "mock-refreshed-token",
        refreshToken: "mock-new-refresh-token",
        expiresIn: 3600,
      }),
      registerExtension: vi.fn().mockResolvedValue({ success: true }),
    })),
    NativeFunctionError: class NativeFunctionError extends Error {},
  };
});

import { NativeFunctionClient } from "../native/client.js";
import { TokenManager } from "../token/manager.js";

let originalFetch: typeof globalThis.fetch;

function createNativeTokenFetch() {
  return vi.fn(async (_url: string | URL | Request, init?: RequestInit) => {
    const request = JSON.parse((init?.body as string | undefined) ?? "{}") as {
      method?: string;
    };
    const result =
      request.method === "refreshToken"
        ? {
            accessToken: "mock-refreshed-token",
            refreshToken: "mock-new-refresh-token",
            expiresIn: 3600,
          }
        : {
            accessToken: "mock-access-token",
            refreshToken: "mock-refresh-token",
            expiresIn: 3600,
          };

    return {
      ok: true,
      status: 200,
      statusText: "OK",
      json: async () => ({ result }),
      text: async () => JSON.stringify({ result }),
    } as unknown as Response;
  });
}

function createNativeTokenError(message: string): Response {
  return {
    ok: true,
    status: 200,
    statusText: "OK",
    json: async () => ({ error: { code: 401, message } }),
    text: async () => JSON.stringify({ error: { code: 401, message } }),
  } as unknown as Response;
}

function getTokenFetchRequest(index: number): { method: string; params: Record<string, unknown> } {
  const call = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[index]!;
  return JSON.parse((call[1] as RequestInit).body as string) as {
    method: string;
    params: Record<string, unknown>;
  };
}

function createMockHttpAdapterHost(): HttpAdapterHost {
  const mockServer = { once: vi.fn() };
  return {
    httpAdapter: { getHttpServer: () => mockServer },
  } as unknown as HttpAdapterHost;
}

function createMockDiscoveryService(
  extensions: ExtensionMetadata[] = [],
  functions: FunctionMetadata[] = []
): ExtensionDiscoveryService {
  return {
    hasExtensions: () => extensions.length > 0,
    getExtensions: () => extensions,
    getExtension: (name: string, systemVersion = "v1") =>
      extensions.find((e) => e.name === name && e.systemVersion === systemVersion),
    getFunction: (fullName: string, systemVersion = "v1") =>
      functions.find((func) => func.fullName === fullName && func.systemVersion === systemVersion),
    getAllFunctions: (systemVersion?: string) =>
      systemVersion === undefined
        ? functions
        : functions.filter((func) => func.systemVersion === systemVersion),
    getPublicFunctions: (systemVersion = "v1") =>
      functions.filter(
        (func) => func.systemVersion === systemVersion && !func.test && !func.hidden
      ),
    getTestFunctions: (systemVersion = "v1") =>
      functions.filter((func) => func.systemVersion === systemVersion && func.test && !func.hidden),
    getSupportedSystemVersions: () => {
      const versions = new Set([
        ...extensions.map((extension) => extension.systemVersion),
        ...functions.map((func) => func.systemVersion),
      ]);
      return versions.size === 0 ? ["v1"] : Array.from(versions);
    },
  } as unknown as ExtensionDiscoveryService;
}

function createService(
  options: ChannelAppModuleOptions,
  discoveryService?: ExtensionDiscoveryService
): ChannelAppService {
  // Use Object.create to bypass NestJS DI decorators (@Inject, @Optional)
  const service = Object.create(ChannelAppService.prototype) as ChannelAppService;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const s = service as any;
  s.options = options;
  s.discoveryService = discoveryService;
  s.httpAdapterHost = createMockHttpAdapterHost();
  const nativeClient = new NativeFunctionClient({
    appStoreUrl: options.appStoreUrl,
    debug: options.debug,
  });
  s.nativeClient = nativeClient;
  s.tokenManager = new TokenManager({
    appId: options.appId,
    appSecret: options.appSecret,
    ...(options.appStoreUrl ? { appStoreUrl: options.appStoreUrl } : {}),
    ...(options.tokenCacheStorage ? { cacheStorage: options.tokenCacheStorage } : {}),
    ...(options.tokenRefreshBufferMs !== undefined
      ? { refreshBufferMs: options.tokenRefreshBufferMs }
      : {}),
    ...(options.debug !== undefined ? { debug: options.debug } : {}),
  });
  s.logger = {
    log: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  };
  return service;
}

/** Get the nativeClient mock instance from a service */
function getClient(service: ChannelAppService) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (service as any).nativeClient as {
    registerExtension: ReturnType<typeof vi.fn>;
  };
}

function expireCachedAppToken(service: ChannelAppService): void {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const tokenManager = (service as any).tokenManager as TokenManager;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const cache = (tokenManager as any).cache.cache as Map<
    string,
    { token: { expiresAt: number }; expiresAt: number }
  >;
  const cached = cache.get("test-app:app");
  if (!cached) {
    throw new Error("Expected app token to be cached");
  }
  cached.token.expiresAt = Date.now() + 60 * 1000;
  cached.expiresAt = Date.now() + 60 * 1000;
}

/**
 * Simulate the HTTP server 'listening' event.
 * onApplicationBootstrap registers a once('listening') handler — this fires it.
 */
async function fireListeningEvent(service: ChannelAppService): Promise<void> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mockServer = (service as any).httpAdapterHost.httpAdapter.getHttpServer();
  const call = (mockServer.once.mock.calls as [string, () => void][]).find(
    ([event]) => event === "listening"
  );
  if (call) await call[1]();
}

describe("ChannelAppService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    originalFetch = globalThis.fetch;
    globalThis.fetch = createNativeTokenFetch();
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  // ============================================
  // Auto-registration (via lifecycle hooks)
  // ============================================

  describe("core extension auto-registration", () => {
    it("should register 'core' extension after listening when autoRegister is true", async () => {
      const onAutoRegister = vi.fn();
      const options: ChannelAppModuleOptions = {
        appId: "test-app",
        appSecret: "test-secret",
        autoRegister: true,
        onAutoRegister,
      };

      const service = createService(options, createMockDiscoveryService([]));
      const client = getClient(service);

      service.onApplicationBootstrap();
      // Nothing registered yet — server not listening
      expect(globalThis.fetch).not.toHaveBeenCalled();

      await fireListeningEvent(service);

      expect(getTokenFetchRequest(0)).toEqual({
        method: "issueToken",
        params: { secret: "test-secret" },
      });
      expect(client.registerExtension).toHaveBeenCalledWith(
        "test-app",
        "core",
        "v1",
        "mock-access-token"
      );
      expect(onAutoRegister).toHaveBeenCalledWith([
        { extensionName: "core", systemVersion: "v1", success: true },
      ]);
    });

    it("should register 'core' when discoveryService is undefined and autoRegister is true", async () => {
      const onAutoRegister = vi.fn();
      const options: ChannelAppModuleOptions = {
        appId: "test-app",
        appSecret: "test-secret",
        autoRegister: true,
        onAutoRegister,
      };

      const service = createService(options, undefined);
      const client = getClient(service);

      service.onApplicationBootstrap();
      await fireListeningEvent(service);

      expect(client.registerExtension).toHaveBeenCalledWith(
        "test-app",
        "core",
        "v1",
        "mock-access-token"
      );
      expect(onAutoRegister).toHaveBeenCalledWith([
        { extensionName: "core", systemVersion: "v1", success: true },
      ]);
    });

    it("should register discovered extensions instead of 'core' when extensions exist", async () => {
      const options: ChannelAppModuleOptions = {
        appId: "test-app",
        appSecret: "test-secret",
        autoRegister: true,
      };

      const extensions: ExtensionMetadata[] = [
        { name: "calendar", systemVersion: "v1", exclusive: false, instance: {}, functions: [] },
      ];
      const service = createService(options, createMockDiscoveryService(extensions));
      const client = getClient(service);

      service.onApplicationBootstrap();
      await fireListeningEvent(service);

      expect(client.registerExtension).toHaveBeenCalledWith(
        "test-app",
        "calendar",
        "v1",
        "mock-access-token"
      );
      expect(client.registerExtension).not.toHaveBeenCalledWith(
        "test-app",
        "core",
        "v1",
        expect.anything()
      );
    });

    it("should add a core target for standalone function versions without an extension", async () => {
      const options: ChannelAppModuleOptions = {
        appId: "test-app",
        appSecret: "test-secret",
        autoRegister: true,
      };
      const extensions: ExtensionMetadata[] = [
        { name: "calendar", systemVersion: "v1", exclusive: false, instance: {}, functions: [] },
      ];
      const functions: FunctionMetadata[] = [
        {
          name: "orders.get",
          fullName: "orders.get",
          systemVersion: "v2",
          methodName: "getV2",
          handler: vi.fn(),
        },
      ];
      const service = createService(options, createMockDiscoveryService(extensions, functions));
      const client = getClient(service);

      service.onApplicationBootstrap();
      await fireListeningEvent(service);

      expect(client.registerExtension).toHaveBeenNthCalledWith(
        1,
        "test-app",
        "calendar",
        "v1",
        "mock-access-token"
      );
      expect(client.registerExtension).toHaveBeenNthCalledWith(
        2,
        "test-app",
        "core",
        "v2",
        "mock-access-token"
      );
    });

    it("should not register anything when autoRegister is false", async () => {
      const options: ChannelAppModuleOptions = {
        appId: "test-app",
        appSecret: "test-secret",
        autoRegister: false,
      };

      const service = createService(options, createMockDiscoveryService([]));

      service.onApplicationBootstrap();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const mockServer = (service as any).httpAdapterHost.httpAdapter.getHttpServer();

      expect(mockServer.once).not.toHaveBeenCalled();
      expect(globalThis.fetch).not.toHaveBeenCalled();
    });

    it("should handle registration failure gracefully", async () => {
      const onAutoRegister = vi.fn();
      const options: ChannelAppModuleOptions = {
        appId: "test-app",
        appSecret: "test-secret",
        autoRegister: true,
        autoRegisterMaxAttempts: 1,
        onAutoRegister,
      };

      const service = createService(options, createMockDiscoveryService([]));
      const client = getClient(service);
      vi.mocked(client.registerExtension).mockResolvedValueOnce({
        success: false,
        errorMessage: "Registration denied",
      });

      service.onApplicationBootstrap();
      await fireListeningEvent(service);

      expect(onAutoRegister).toHaveBeenCalledWith([
        {
          extensionName: "core",
          systemVersion: "v1",
          success: false,
          error: "Registration denied",
        },
      ]);
    });

    it("should handle registration exception gracefully", async () => {
      const onAutoRegister = vi.fn();
      const options: ChannelAppModuleOptions = {
        appId: "test-app",
        appSecret: "test-secret",
        autoRegister: true,
        autoRegisterMaxAttempts: 1,
        onAutoRegister,
      };

      const service = createService(options, createMockDiscoveryService([]));
      const client = getClient(service);
      vi.mocked(client.registerExtension).mockRejectedValueOnce(new Error("Network error"));

      service.onApplicationBootstrap();
      await fireListeningEvent(service);

      expect(onAutoRegister).toHaveBeenCalledWith([
        { extensionName: "core", systemVersion: "v1", success: false, error: "Network error" },
      ]);
    });

    it("should report every target as failed when app token issuance fails", async () => {
      const onAutoRegister = vi.fn();
      const options: ChannelAppModuleOptions = {
        appId: "test-app",
        appSecret: "test-secret",
        autoRegister: true,
        autoRegisterMaxAttempts: 1,
        onAutoRegister,
      };
      const extensions: ExtensionMetadata[] = [
        { name: "calendar", systemVersion: "v1", exclusive: false, instance: {}, functions: [] },
        { name: "messaging", systemVersion: "v2", exclusive: false, instance: {}, functions: [] },
      ];
      const service = createService(options, createMockDiscoveryService(extensions));
      const client = getClient(service);
      vi.mocked(globalThis.fetch).mockResolvedValueOnce(createNativeTokenError("Token denied"));

      await (service as any).autoRegisterExtensions();

      expect(client.registerExtension).not.toHaveBeenCalled();
      expect(onAutoRegister).toHaveBeenCalledWith([
        {
          extensionName: "calendar",
          systemVersion: "v1",
          success: false,
          error: "Token denied",
        },
        {
          extensionName: "messaging",
          systemVersion: "v2",
          success: false,
          error: "Token denied",
        },
      ]);
    });

    it("should retry transient registration failures before reporting success", async () => {
      const onAutoRegister = vi.fn();
      const options: ChannelAppModuleOptions = {
        appId: "test-app",
        appSecret: "test-secret",
        autoRegister: true,
        autoRegisterMaxAttempts: 2,
        autoRegisterInitialBackoffMs: 1,
        onAutoRegister,
      };

      const service = createService(options, createMockDiscoveryService([]));
      const client = getClient(service);
      vi.mocked(client.registerExtension)
        .mockResolvedValueOnce({
          success: false,
          errorMessage:
            "saga register_extension failed at step register_extension: getFunctions failed: App server request failed",
        })
        .mockResolvedValueOnce({ success: true });

      await (service as any).autoRegisterExtensions();

      expect(client.registerExtension).toHaveBeenCalledTimes(2);
      expect(onAutoRegister).toHaveBeenCalledTimes(1);
      expect(onAutoRegister).toHaveBeenCalledWith([
        { extensionName: "core", systemVersion: "v1", success: true },
      ]);
    });
  });

  // ============================================
  // Token caching
  // ============================================

  describe("token caching", () => {
    it("should call issueToken only once across multiple registerExtensions calls", async () => {
      const options: ChannelAppModuleOptions = {
        appId: "test-app",
        appSecret: "test-secret",
        autoRegister: true,
      };

      const service = createService(options, createMockDiscoveryService([]));

      await (service as any).autoRegisterExtensions();
      await (service as any).autoRegisterExtensions();

      expect(globalThis.fetch).toHaveBeenCalledTimes(1);
      expect(getTokenFetchRequest(0).method).toBe("issueToken");
    });

    it("should use refreshToken when cached token is about to expire", async () => {
      const options: ChannelAppModuleOptions = {
        appId: "test-app",
        appSecret: "test-secret",
        autoRegister: true,
      };

      const service = createService(options, createMockDiscoveryService([]));
      await (service as any).autoRegisterExtensions();

      expireCachedAppToken(service);
      await (service as any).autoRegisterExtensions();

      expect(globalThis.fetch).toHaveBeenCalledTimes(2);
      expect(getTokenFetchRequest(0).method).toBe("issueToken");
      expect(getTokenFetchRequest(1)).toEqual({
        method: "refreshToken",
        params: { refreshToken: "mock-refresh-token" },
      });
    });

    it("should fall back to issueToken when refreshToken fails", async () => {
      const options: ChannelAppModuleOptions = {
        appId: "test-app",
        appSecret: "test-secret",
        autoRegister: true,
      };

      const service = createService(options, createMockDiscoveryService([]));
      await (service as any).autoRegisterExtensions();

      expireCachedAppToken(service);
      vi.mocked(globalThis.fetch).mockResolvedValueOnce(createNativeTokenError("Unauthorized"));
      await (service as any).autoRegisterExtensions();

      expect(globalThis.fetch).toHaveBeenCalledTimes(3);
      expect(getTokenFetchRequest(0).method).toBe("issueToken");
      expect(getTokenFetchRequest(1).method).toBe("refreshToken");
      expect(getTokenFetchRequest(2).method).toBe("issueToken");
    });
  });

  describe("debug logging", () => {
    it("should redact sensitive request and output fields", async () => {
      const options: ChannelAppModuleOptions = {
        appId: "test-app",
        appSecret: "test-secret",
        debug: true,
      };

      const discoveryService = createMockDiscoveryService([]);
      const service = createService(options, discoveryService);
      const logger = (service as any).logger as {
        debug: ReturnType<typeof vi.fn>;
      };

      (discoveryService as any).getFunction = vi.fn().mockReturnValue({
        handler: vi.fn().mockResolvedValue({
          ok: true,
          authToken: "result-auth-token",
          nested: {
            accessToken: "nested-access-token",
          },
        }),
      });

      await service.handleFunctionCall({
        method: "extension.messaging.thread.sync",
        context: {
          channelId: "ch-1",
          authToken: "request-auth-token",
          apiCredentials: {
            accessKey: "access-key",
            secretKey: "secret-key",
          },
        } as never,
        params: {
          refreshToken: "refresh-token-123",
          plainText: "hello",
        },
      });

      expect(logger.debug).toHaveBeenNthCalledWith(
        1,
        "Calling function: extension.messaging.thread.sync (v1)"
      );
      expect(logger.debug).toHaveBeenNthCalledWith(
        2,
        'Request: {"method":"extension.messaging.thread.sync","context":{"channelId":"ch-1","authToken":"[REDACTED]","apiCredentials":"[REDACTED]"},"params":{"refreshToken":"[REDACTED]","plainText":"hello"}}'
      );
      expect(logger.debug).toHaveBeenNthCalledWith(
        3,
        'Output: {"ok":true,"authToken":"[REDACTED]","nested":{"accessToken":"[REDACTED]"}}'
      );
    });
  });

  describe("function discovery", () => {
    it("should invoke a hidden function by its full name", async () => {
      const options: ChannelAppModuleOptions = {
        appId: "test-app",
        appSecret: "test-secret",
      };
      const discoveryService = createMockDiscoveryService([]);
      const service = createService(options, discoveryService);
      const handler = vi.fn().mockResolvedValue({ ok: true });

      (discoveryService as any).getFunction = vi.fn().mockReturnValue({
        fullName: "internal.ping",
        hidden: true,
        handler,
      });

      await expect(
        service.handleFunctionCall({
          method: "internal.ping",
          context: {
            caller: { type: "system", id: "internal-service" },
          } as never,
          params: {},
        })
      ).resolves.toEqual({ result: { ok: true } });
      expect(handler).toHaveBeenCalledWith(
        { caller: { type: "system", id: "internal-service" } },
        {}
      );
    });

    it("should keep test functions out of getFunctions", async () => {
      const options: ChannelAppModuleOptions = {
        appId: "test-app",
        appSecret: "test-secret",
      };
      const discoveryService = createMockDiscoveryService([]);
      const service = createService(options, discoveryService);

      (discoveryService as any).getPublicFunctions = vi.fn().mockReturnValue([
        {
          fullName: "extension.order.getOrder",
          inputJsonSchema: { type: "object" },
        },
      ]);
      (discoveryService as any).getTestFunctions = vi.fn().mockReturnValue([
        {
          fullName: "extension.order.createTestOrder",
          inputJsonSchema: { type: "object" },
          test: true,
        },
      ]);

      await expect(
        service.handleFunctionCall({
          method: "extension.core.function.getFunctions",
          context: {} as never,
          params: {},
        })
      ).resolves.toEqual({
        result: {
          functions: [
            {
              name: "extension.order.getOrder",
              inputSchema: { type: "object" },
            },
          ],
          success: true,
          errorMessage: "",
        },
      });
    });

    it("should expose test functions through getTestFunctions", async () => {
      const options: ChannelAppModuleOptions = {
        appId: "test-app",
        appSecret: "test-secret",
      };
      const discoveryService = createMockDiscoveryService([]);
      const service = createService(options, discoveryService);

      (discoveryService as any).getTestFunctions = vi.fn().mockReturnValue([
        {
          fullName: "extension.order.createTestOrder",
          description: "Create a test order",
          inputJsonSchema: { type: "object" },
          outputJsonSchema: { type: "object" },
          test: true,
        },
      ]);

      await expect(
        service.handleFunctionCall({
          method: "extension.core.function.getTestFunctions",
          context: {} as never,
          params: {},
        })
      ).resolves.toEqual({
        result: {
          functions: [
            {
              name: "extension.order.createTestOrder",
              description: "Create a test order",
              inputSchema: { type: "object" },
              outputSchema: { type: "object" },
            },
          ],
          success: true,
          errorMessage: "",
        },
      });
    });
  });

  describe("function call errors", () => {
    it("should serialize typed function call errors as JSON-RPC errors", async () => {
      const options: ChannelAppModuleOptions = {
        appId: "test-app",
        appSecret: "test-secret",
      };
      const discoveryService = createMockDiscoveryService([]);
      const service = createService(options, discoveryService);

      (discoveryService as any).getFunction = vi.fn().mockReturnValue({
        handler: vi.fn().mockRejectedValue(new FunctionCallNotFoundError("order not found")),
      });

      await expect(
        service.handleFunctionCall({
          method: "extension.wms.core.getOrder",
          context: {
            app: { id: "app-1" },
            channel: { id: "ch-1" },
            caller: { id: "user-1", type: "user" },
          },
          params: { orderId: "missing" },
        })
      ).resolves.toEqual({
        error: {
          code: 3,
          message: "order not found",
        },
      });
    });
  });

  // ============================================
  // getRegisteredVersions
  // ============================================

  describe("getRegisteredVersions", () => {
    it("should return default version when no extensions and autoRegister is true", () => {
      const options: ChannelAppModuleOptions = {
        appId: "test-app",
        appSecret: "test-secret",
        autoRegister: true,
      };

      const service = createService(options, createMockDiscoveryService([]));

      expect(service.getRegisteredVersions()).toEqual(["v1"]);
    });

    it("should return the default routable version when autoRegister is false", () => {
      const options: ChannelAppModuleOptions = {
        appId: "test-app",
        appSecret: "test-secret",
        autoRegister: false,
      };

      const service = createService(options, createMockDiscoveryService([]));

      expect(service.getRegisteredVersions()).toEqual(["v1"]);
    });

    it("should return versions from discovered extensions", () => {
      const options: ChannelAppModuleOptions = {
        appId: "test-app",
        appSecret: "test-secret",
        autoRegister: true,
      };

      const extensions: ExtensionMetadata[] = [
        { name: "calendar", systemVersion: "v2", exclusive: false, instance: {}, functions: [] },
      ];
      const service = createService(options, createMockDiscoveryService(extensions));

      expect(service.getRegisteredVersions()).toEqual(["v2"]);
    });
  });

  describe("system-version routing", () => {
    const functionMetadata = (
      systemVersion: string,
      fullName: string,
      handler: FunctionMetadata["handler"]
    ): FunctionMetadata => ({
      name: fullName,
      fullName,
      systemVersion,
      methodName: fullName,
      handler,
    });

    it("routes the same method to handlers scoped by URL version", async () => {
      const v1Handler = vi.fn().mockResolvedValue({ version: "v1" });
      const v2Handler = vi.fn().mockResolvedValue({ version: "v2" });
      const discovery = createMockDiscoveryService(
        [],
        [
          functionMetadata("v1", "orders.get", v1Handler),
          functionMetadata("v2", "orders.get", v2Handler),
        ]
      );
      const service = createService({ appId: "test-app", appSecret: "test-secret" }, discovery);

      await expect(
        service.handleFunctionCall(
          { method: "orders.get", systemVersion: "v2", context: {} as never, params: {} },
          "v2"
        )
      ).resolves.toEqual({ result: { version: "v2" } });
      expect(v1Handler).not.toHaveBeenCalled();
      expect(v2Handler).toHaveBeenCalledOnce();
    });

    it("uses the URL version when the body omits systemVersion", async () => {
      const handler = vi.fn().mockResolvedValue({ version: "v2" });
      const service = createService(
        { appId: "test-app", appSecret: "test-secret" },
        createMockDiscoveryService([], [functionMetadata("v2", "orders.get", handler)])
      );

      await expect(
        service.handleFunctionCall({ method: "orders.get", context: {} as never, params: {} }, "v2")
      ).resolves.toEqual({ result: { version: "v2" } });
    });

    it("rejects URL and body version mismatches", async () => {
      const service = createService(
        { appId: "test-app", appSecret: "test-secret" },
        createMockDiscoveryService()
      );

      await expect(
        service.handleFunctionCall(
          { method: "orders.get", systemVersion: "v2", context: {} as never },
          "v1"
        )
      ).rejects.toMatchObject({
        name: "VersionMismatchError",
        requestedVersion: "v2",
        routeVersion: "v1",
      });
    });

    it("rejects unsupported versions without falling back", async () => {
      const handler = vi.fn().mockResolvedValue({ version: "v1" });
      const service = createService(
        { appId: "test-app", appSecret: "test-secret" },
        createMockDiscoveryService([], [functionMetadata("v1", "orders.get", handler)])
      );

      await expect(
        service.handleFunctionCall(
          { method: "orders.get", systemVersion: "v2", context: {} as never },
          "v2"
        )
      ).rejects.toBeInstanceOf(VersionMismatchError);
      expect(handler).not.toHaveBeenCalled();
    });

    it("returns method-not-found when the version exists without the requested method", async () => {
      const service = createService(
        { appId: "test-app", appSecret: "test-secret" },
        createMockDiscoveryService(
          [],
          [functionMetadata("v2", "orders.list", vi.fn().mockResolvedValue([]))]
        )
      );

      await expect(
        service.handleFunctionCall(
          { method: "orders.get", systemVersion: "v2", context: {} as never },
          "v2"
        )
      ).rejects.toBeInstanceOf(FunctionNotFoundError);
    });

    it("scopes getFunctions to the requested version", async () => {
      const service = createService(
        { appId: "test-app", appSecret: "test-secret" },
        createMockDiscoveryService(
          [],
          [
            functionMetadata("v1", "orders.get", vi.fn()),
            functionMetadata("v2", "orders.get", vi.fn()),
            functionMetadata("v2", "orders.list", vi.fn()),
          ]
        )
      );

      await expect(
        service.handleFunctionCall(
          {
            method: "extension.core.function.getFunctions",
            systemVersion: "v2",
            context: {} as never,
          },
          "v2"
        )
      ).resolves.toMatchObject({
        result: {
          functions: [{ name: "orders.get" }, { name: "orders.list" }],
        },
      });
    });
  });

  // ============================================
  // Static constants
  // ============================================

  describe("static constants", () => {
    it("should expose CORE_EXTENSION_NAME as 'core'", () => {
      expect(ChannelAppService.CORE_EXTENSION_NAME).toBe("core");
    });

    it("should expose DEFAULT_SYSTEM_VERSION as 'v1'", () => {
      expect(ChannelAppService.DEFAULT_SYSTEM_VERSION).toBe("v1");
    });
  });
});
