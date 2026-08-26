import { describe, it, expect, expectTypeOf, vi, beforeEach, afterEach } from "vitest";
import { NativeFunctionClient, NativeFunctionError } from "../native/client.js";

/**
 * Helper to create a mock fetch Response
 */
function mockFetchResponse(body: unknown, status = 200): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    statusText: status === 200 ? "OK" : "Error",
    json: () => Promise.resolve(body),
    text: () => Promise.resolve(JSON.stringify(body)),
  } as Response;
}

interface ParsedRequest {
  method: string;
  params: Record<string, unknown>;
  context?: Record<string, unknown>;
  systemVersion?: string;
}

function parseFetchBody(mockFetch: ReturnType<typeof vi.fn>, callIndex = 0): ParsedRequest {
  const call = mockFetch.mock.calls[callIndex] as [string, RequestInit];
  return JSON.parse(call[1].body as string) as ParsedRequest;
}

function getFetchUrl(mockFetch: ReturnType<typeof vi.fn>, callIndex = 0): string {
  const call = mockFetch.mock.calls[callIndex] as [string, RequestInit];
  return call[0];
}

function getFetchInit(mockFetch: ReturnType<typeof vi.fn>, callIndex = 0): RequestInit {
  const call = mockFetch.mock.calls[callIndex] as [string, RequestInit];
  return call[1];
}

function createDebugClient(): NativeFunctionClient {
  return new NativeFunctionClient({
    appStoreUrl: "https://test-app-store.example.com",
    debug: true,
  });
}

describe("NativeFunctionClient", () => {
  const APP_ID = "test-app-id";
  const APP_SECRET = "test-app-secret";
  let client: NativeFunctionClient;
  let mockFetch: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    client = new NativeFunctionClient({
      appStoreUrl: "https://test-app-store.example.com",
    });
    mockFetch = vi.fn();
    globalThis.fetch = mockFetch;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // ============================================
  // Auth Functions
  // ============================================

  describe("issueToken", () => {
    it("should call issueToken with secret only (app-scoped)", async () => {
      const tokenResult = {
        accessToken: "access-123",
        refreshToken: "refresh-456",
        expiresIn: 3600,
      };
      mockFetch.mockResolvedValueOnce(mockFetchResponse({ result: tokenResult }));

      const result = await client.issueToken(APP_SECRET);

      expect(mockFetch).toHaveBeenCalledOnce();
      const url = getFetchUrl(mockFetch);
      expect(url).toBe("https://test-app-store.example.com/general/v1/native/functions");
      const init = getFetchInit(mockFetch);
      expect(init.method).toBe("PUT");

      const body = parseFetchBody(mockFetch);
      expect(body.method).toBe("issueToken");
      expect(body.params["secret"]).toBe(APP_SECRET);
      expect(body.params["channelId"]).toBeUndefined();
      expect(result).toEqual(tokenResult);
    });

    it("should call issueToken with channelId (channel-scoped)", async () => {
      const tokenResult = {
        accessToken: "access-789",
        refreshToken: "refresh-012",
        expiresIn: 3600,
      };
      mockFetch.mockResolvedValueOnce(mockFetchResponse({ result: tokenResult }));

      const result = await client.issueToken(APP_SECRET, { channelId: "ch-123" });

      const body = parseFetchBody(mockFetch);
      expect(body.params["channelId"]).toBe("ch-123");
      expect(result).toEqual(tokenResult);
    });
  });

  describe("refreshToken", () => {
    it("should call refreshToken with the refresh token", async () => {
      const tokenResult = {
        accessToken: "new-access",
        refreshToken: "new-refresh",
        expiresIn: 3600,
      };
      mockFetch.mockResolvedValueOnce(mockFetchResponse({ result: tokenResult }));

      const result = await client.refreshToken("old-refresh-token");

      const body = parseFetchBody(mockFetch);
      expect(body.method).toBe("refreshToken");
      expect(body.params["refreshToken"]).toBe("old-refresh-token");
      expect(result).toEqual(tokenResult);
    });
  });

  // ============================================
  // Extension Functions
  // ============================================

  describe("registerExtension", () => {
    it("should call registerExtension with appId, extensionName, and systemVersion", async () => {
      const registerResult = {
        success: true,
        extensions: [{ name: "calendar", systemVersion: "v1" }],
      };
      mockFetch.mockResolvedValueOnce(mockFetchResponse({ result: registerResult }));

      const result = await client.registerExtension(APP_ID, "calendar", "v1", "test-token");

      const body = parseFetchBody(mockFetch);
      expect(body.method).toBe("registerExtension");
      expect(body.params).toEqual({
        appId: APP_ID,
        systemVersion: "v1",
        extensionName: "calendar",
      });
      expect(result).toEqual(registerResult);
    });

    it("should return validation errors when registration fails", async () => {
      const failResult = {
        success: false,
        errorMessage: "Invalid extension",
        validationErrors: ["Extension name is not allowed"],
      };
      mockFetch.mockResolvedValueOnce(mockFetchResponse({ result: failResult }));

      const result = await client.registerExtension(APP_ID, "invalid", "v1", "test-token");

      expect(result.success).toBe(false);
      expect(result.errorMessage).toBe("Invalid extension");
      expect(result.validationErrors).toContain("Extension name is not allowed");
    });
  });

  describe("unregisterExtension", () => {
    it("should call unregisterExtension with appId, extensionName, and systemVersion", async () => {
      const unregisterResult = { success: true };
      mockFetch.mockResolvedValueOnce(mockFetchResponse({ result: unregisterResult }));

      const result = await client.unregisterExtension(APP_ID, "calendar", "v1", "test-token");

      const body = parseFetchBody(mockFetch);
      expect(body.method).toBe("unregisterExtension");
      expect(body.params).toEqual({
        appId: APP_ID,
        systemVersion: "v1",
        extensionName: "calendar",
      });
      expect(result).toEqual(unregisterResult);
    });

    it("should return error when unregistration fails", async () => {
      const failResult = {
        success: false,
        errorMessage: "Extension not found",
      };
      mockFetch.mockResolvedValueOnce(mockFetchResponse({ result: failResult }));

      const result = await client.unregisterExtension(APP_ID, "nonexistent", "v1", "test-token");

      expect(result.success).toBe(false);
      expect(result.errorMessage).toBe("Extension not found");
    });
  });

  // ============================================
  // ALF Task Functions
  // ============================================

  describe("getAlfTaskVersions", () => {
    it("should call getAlfTaskVersions with appId and token", async () => {
      const versionsResult = {
        success: true,
        tasks: [
          { id: "task-1", name: "Auto-categorize", version: "v1.0.0" },
          { id: "task-2", name: "Auto-reply", version: "v2.1.0" },
        ],
      };
      mockFetch.mockResolvedValueOnce(mockFetchResponse({ result: versionsResult }));

      const result = await client.getAlfTaskVersions(APP_ID, "test-token");

      const body = parseFetchBody(mockFetch);
      expect(body.method).toBe("getAlfTaskVersions");
      expect(body.params).toEqual({ appId: APP_ID });
      const init = getFetchInit(mockFetch);
      expect((init.headers as Record<string, string>)["x-access-token"]).toBe("test-token");
      expect(result).toEqual(versionsResult);
      expect(result.tasks).toHaveLength(2);
      expect(result.tasks[0]?.name).toBe("Auto-categorize");
    });

    it("should return empty tasks on error", async () => {
      const failResult = {
        success: false,
        errorMessage: "App not found",
        tasks: [],
      };
      mockFetch.mockResolvedValueOnce(mockFetchResponse({ result: failResult }));

      const result = await client.getAlfTaskVersions(APP_ID, "test-token");

      expect(result.success).toBe(false);
      expect(result.tasks).toEqual([]);
    });
  });

  // ============================================
  // App Notebook Functions
  // ============================================

  describe("getAppNotebookVersions", () => {
    it("should call getAppNotebookVersions with appId and token", async () => {
      const versionsResult = {
        success: true,
        notebooks: [
          {
            notebookKey: "sales",
            version: 3,
            latestRevisionId: "rev-1",
            updatedAt: "2026-07-13T00:00:00Z",
          },
        ],
      };
      mockFetch.mockResolvedValueOnce(mockFetchResponse({ result: versionsResult }));

      const result = await client.getAppNotebookVersions(APP_ID, "test-token");

      const body = parseFetchBody(mockFetch);
      expect(body.method).toBe("getAppNotebookVersions");
      expect(body.params).toEqual({ appId: APP_ID });
      const init = getFetchInit(mockFetch);
      expect((init.headers as Record<string, string>)["x-access-token"]).toBe("test-token");
      expect(result).toEqual(versionsResult);
      expect(result.notebooks[0]?.notebookKey).toBe("sales");
    });
  });

  // ============================================
  // AppDataTable Functions
  // ============================================

  describe("AppDataTable functions", () => {
    it("should call createAppDataTable with an app-scoped token", async () => {
      const expected = { requestId: "req-1" };
      mockFetch.mockResolvedValueOnce(mockFetchResponse({ result: expected }));

      const result = await client.createAppDataTable(
        {
          appId: APP_ID,
          tableName: "orders",
          columns: [{ key: "id", name: "ID", type: "OPERATOR_TYPE_STRING" }],
          primaryKeyColumns: ["id"],
        },
        "app-token"
      );

      const body = parseFetchBody(mockFetch);
      expect(body.method).toBe("createAppDataTable");
      expect(body.params).toEqual({
        appId: APP_ID,
        tableName: "orders",
        columns: [{ key: "id", name: "ID", type: "OPERATOR_TYPE_STRING" }],
        primaryKeyColumns: ["id"],
      });
      const init = getFetchInit(mockFetch);
      expect((init.headers as Record<string, string>)["x-access-token"]).toBe("app-token");
      expect(result).toEqual(expected);
    });

    it("should call upsertAppDataTableRows with an app-scoped token", async () => {
      const expected = {
        requestId: "req-2",
        acceptedRowCount: 1,
      };
      mockFetch.mockResolvedValueOnce(mockFetchResponse({ result: expected }));

      const result = await client.upsertAppDataTableRows(
        {
          channelId: "ch-1",
          appId: APP_ID,
          tableName: "orders",
          rows: [{ id: "order-1", channelId: "ch-1" }],
        },
        "app-token"
      );

      const body = parseFetchBody(mockFetch);
      expect(body.method).toBe("upsertAppDataTableRows");
      expect(body.params).toEqual({
        channelId: "ch-1",
        appId: APP_ID,
        tableName: "orders",
        rows: [{ id: "order-1", channelId: "ch-1" }],
      });
      const init = getFetchInit(mockFetch);
      expect((init.headers as Record<string, string>)["x-access-token"]).toBe("app-token");
      expect(result).toEqual(expected);
    });
  });

  describe("OAuth manager target functions", () => {
    it("should discover active OAuth manager targets with an app token", async () => {
      const expected = {
        targets: [{ channelId: "channel-1", managerId: "manager-1" }],
        nextCursor: "cursor-2",
      };
      mockFetch.mockResolvedValueOnce(mockFetchResponse({ result: expected }));

      const result = await client.listActiveOAuthManagerTargets(
        { limit: 500, cursor: "cursor-1" },
        "app-token"
      );

      const body = parseFetchBody(mockFetch);
      expect(body).toEqual({
        method: "listActiveOAuthManagerTargets",
        params: { limit: 500, cursor: "cursor-1" },
      });
      const init = getFetchInit(mockFetch);
      expect((init.headers as Record<string, string>)["x-access-token"]).toBe("app-token");
      expect(result).toEqual(expected);
    });
  });

  // ============================================
  // Typed Native Function Calls
  // ============================================

  describe("typed native function calls", () => {
    it("should type and call findOrCreateContactAndUser with token", async () => {
      const expected = {
        contact: { id: "contact-1" },
        user: { id: "user-1" },
      };
      mockFetch.mockResolvedValueOnce(mockFetchResponse({ result: expected }));

      const result = await client.callNativeFunctionWithToken(
        "findOrCreateContactAndUser",
        {
          channelId: "ch-1",
          mediumType: "app",
          mediumId: "app-1",
          address: "customer-1",
          defaultMediumLanguage: "ko",
        },
        "test-token"
      );

      expectTypeOf(result.user.id).toEqualTypeOf<string>();
      const body = parseFetchBody(mockFetch);
      expect(body.method).toBe("findOrCreateContactAndUser");
      expect(body.params).toEqual({
        channelId: "ch-1",
        mediumType: "app",
        mediumId: "app-1",
        address: "customer-1",
        defaultMediumLanguage: "ko",
      });
      const init = getFetchInit(mockFetch);
      expect((init.headers as Record<string, string>)["x-access-token"]).toBe("test-token");
      expect(result).toEqual(expected);
    });

    it("should type and call writeUserChatMessage with message options", async () => {
      const expected = { message: { id: "message-1" } };
      mockFetch.mockResolvedValueOnce(mockFetchResponse({ result: expected }));

      const result = await client.callNativeFunctionWithToken(
        "writeUserChatMessage",
        {
          channelId: "ch-1",
          userChatId: "user-chat-1",
          dto: {
            plainText: "hello",
            botName: "Bot",
            options: ["MESSAGE_OPTION_PRIVATE", "MESSAGE_OPTION_DO_NOT_UPDATE_DESK"],
          },
        },
        "test-token"
      );

      expectTypeOf(result.message.id).toEqualTypeOf<string | undefined>();
      const body = parseFetchBody(mockFetch);
      expect(body.method).toBe("writeUserChatMessage");
      expect(body.params["dto"]).toEqual({
        plainText: "hello",
        botName: "Bot",
        options: ["MESSAGE_OPTION_PRIVATE", "MESSAGE_OPTION_DO_NOT_UPDATE_DESK"],
      });
      expect(result).toEqual(expected);
    });

    it("should call the Manager private-note method with its one-purpose credential", async () => {
      const expected = { message: { id: "message-private-1" } };
      mockFetch.mockResolvedValueOnce(mockFetchResponse({ result: expected }));

      const result = await client.writeUserChatPrivateNoteByManager(
        {
          channelId: "ch-1",
          userChatId: "user-chat-1",
          requestId: "request-1",
          lifecycleRevision: 7,
          dto: {
            plainText: "private note",
            customPayload: { source: "synthetic-slack-reply" },
          },
        },
        "manager-private-note-credential"
      );

      const body = parseFetchBody(mockFetch);
      expect(body).toEqual({
        method: "writeUserChatPrivateNoteByManager",
        params: {
          channelId: "ch-1",
          userChatId: "user-chat-1",
          requestId: "request-1",
          lifecycleRevision: 7,
          dto: {
            plainText: "private note",
            customPayload: { source: "synthetic-slack-reply" },
          },
        },
      });
      const init = getFetchInit(mockFetch);
      expect((init.headers as Record<string, string>)["x-access-token"]).toBe(
        "manager-private-note-credential"
      );
      expect(result).toEqual(expected);
    });
  });

  // ============================================
  // Error Handling
  // ============================================

  describe("error handling", () => {
    it("should throw NativeFunctionError on HTTP error", async () => {
      mockFetch.mockResolvedValue(mockFetchResponse({ error: "not found" }, 404));

      await expect(client.issueToken(APP_SECRET)).rejects.toThrow(NativeFunctionError);
    });

    it("should throw NativeFunctionError on API error response", async () => {
      mockFetch.mockResolvedValue(
        mockFetchResponse({
          error: { code: 400, message: "Invalid params" },
        })
      );

      await expect(client.getAlfTaskVersions(APP_ID, "test-token")).rejects.toThrow(
        "Invalid params"
      );
    });
  });

  describe("debug logging", () => {
    it("should encode app IDs used in URL paths", async () => {
      mockFetch.mockResolvedValueOnce(mockFetchResponse({ result: { ok: true } }));

      await client.callAppFunction(
        "app/with special?characters",
        "syncContacts",
        {},
        {} as never,
        "rbac-access-token"
      );

      expect(getFetchUrl(mockFetch)).toBe(
        "https://test-app-store.example.com/general/v1/apps/app%2Fwith%20special%3Fcharacters/functions"
      );
    });

    it("should redact secrets and token values in debug logs", async () => {
      const debugClient = createDebugClient();
      const debugSpy = vi.spyOn(console, "debug").mockImplementation(() => {});
      const tokenResult = {
        accessToken: "access-123",
        refreshToken: "refresh-456",
        expiresIn: 3600,
      };
      mockFetch.mockResolvedValueOnce(mockFetchResponse({ result: tokenResult }));

      await debugClient.issueToken(APP_SECRET);

      expect(debugSpy).toHaveBeenNthCalledWith(
        1,
        "[NativeFunctionClient] Calling native function: issueToken",
        { secret: "[REDACTED]" }
      );
      expect(debugSpy).toHaveBeenNthCalledWith(2, "[NativeFunctionClient] issueToken response", {
        accessToken: "[REDACTED]",
        refreshToken: "[REDACTED]",
        expiresIn: 3600,
      });
    });

    it("should redact nested app function credentials in debug logs", async () => {
      const debugClient = createDebugClient();
      const debugSpy = vi.spyOn(console, "debug").mockImplementation(() => {});
      mockFetch.mockResolvedValueOnce(mockFetchResponse({ result: { ok: true } }));

      await debugClient.callAppFunction(
        APP_ID,
        "syncContacts",
        { contactId: "contact-1" },
        {
          channelId: "ch-1",
          authToken: "auth-token-123",
          apiCredentials: {
            accessKey: "access-key",
            secretKey: "secret-key",
          },
        } as never,
        "rbac-access-token"
      );

      expect(debugSpy).toHaveBeenNthCalledWith(
        1,
        `[NativeFunctionClient] Calling app function: ${APP_ID}/syncContacts`,
        {
          params: { contactId: "contact-1" },
          context: {
            channelId: "ch-1",
            authToken: "[REDACTED]",
            apiCredentials: "[REDACTED]",
          },
        }
      );
      expect(debugSpy).toHaveBeenNthCalledWith(2, "[NativeFunctionClient] syncContacts response", {
        ok: true,
      });
    });
  });
});
