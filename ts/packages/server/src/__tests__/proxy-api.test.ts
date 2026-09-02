import { describe, it, expect, expectTypeOf, vi, beforeEach } from "vitest";
import { NativeFunctionClient } from "../native/client.js";
import { ProxyApi } from "../native/proxy-api.js";
import type {
  WriteGroupMessageRequest,
  WriteGroupMessageAsManagerRequest,
  WriteUserChatMessageRequest,
  WriteUserChatMessageAsManagerRequest,
  WriteUserChatMessageAsUserRequest,
  WriteDirectChatMessageAsManagerRequest,
  WriteUserChatPrivateNoteWithManagerCredentialRequest,
  WriteUserChatPrivateNoteWithManagerCredentialResult,
  PatchMessageRequest,
  GetManagerRequest,
  BatchGetManagersRequest,
  SearchManagersRequest,
  GetUserRequest,
  SearchUserRequest,
  PatchUserRequest,
  GetUserChatRequest,
  ManageUserChatRequest,
  GetGroupRequest,
  SearchGroupsRequest,
  GetChannelRequest,
} from "../native/proxy-api.types.js";

describe("ProxyApi", () => {
  let client: NativeFunctionClient;
  let api: ProxyApi;
  const accessToken = "test-access-token";

  beforeEach(() => {
    client = new NativeFunctionClient();
    api = client.createProxyApi(accessToken);
  });

  /**
   * Helper to spy on callNativeFunctionWithToken and verify it's called correctly
   */
  function mockCall<TResult>(result: TResult) {
    return vi.spyOn(client, "callNativeFunctionWithToken").mockResolvedValue(result as any);
  }

  // ============================================
  // Factory method
  // ============================================

  describe("createProxyApi", () => {
    it("should return a ProxyApi instance", () => {
      expect(api).toBeInstanceOf(ProxyApi);
    });
  });

  // ============================================
  // Message API
  // ============================================

  describe("Message API", () => {
    it("exports the narrow Manager private-note request and result aliases", () => {
      expectTypeOf<WriteUserChatPrivateNoteWithManagerCredentialRequest>().toMatchTypeOf<{
        channelId: string;
        userChatId: string;
        requestId: string;
        lifecycleRevision: number;
        dto: { blocks?: readonly object[]; plainText?: string; customPayload?: object };
      }>();
      expectTypeOf<WriteUserChatPrivateNoteWithManagerCredentialResult>().toMatchTypeOf<{
        message: object;
      }>();
    });

    it("writeGroupMessage should call with correct method and params", async () => {
      const params: WriteGroupMessageRequest = {
        channelId: "ch-1",
        groupId: "grp-1",
        dto: { plainText: "Hello" },
      };
      const expected = { message: { id: "msg-1", plainText: "Hello" } };
      const spy = mockCall(expected);

      const result = await api.writeGroupMessage(params);

      expect(spy).toHaveBeenCalledWith("writeGroupMessage", params, accessToken);
      expect(result).toEqual(expected);
    });

    it("writeGroupMessage should pass optional fields", async () => {
      const params: WriteGroupMessageRequest = {
        channelId: "ch-1",
        groupId: "grp-1",
        rootMessageId: "root-1",
        broadcast: true,
        dto: {
          plainText: "Thread reply",
          buttons: [{ title: "Click" }],
          botName: "TestBot",
        },
      };
      const spy = mockCall({ message: { id: "msg-2" } });

      await api.writeGroupMessage(params);

      expect(spy).toHaveBeenCalledWith("writeGroupMessage", params, accessToken);
    });

    it("writeGroupMessageAsManager should call with correct method and params", async () => {
      const params: WriteGroupMessageAsManagerRequest = {
        channelId: "ch-1",
        groupId: "grp-1",
        dto: { plainText: "Manager message", managerId: "manager-1" },
      };
      const expected = { message: { id: "msg-manager" } };
      const spy = mockCall(expected);

      const result = await api.writeGroupMessageAsManager(params);

      expect(spy).toHaveBeenCalledWith("writeGroupMessageAsManager", params, accessToken);
      expect(result).toEqual(expected);
    });

    it("writeUserChatMessage should call with correct method and params", async () => {
      const params: WriteUserChatMessageRequest = {
        channelId: "ch-1",
        userChatId: "uc-1",
        dto: { plainText: "Hi user" },
      };
      const expected = { message: { id: "msg-3" } };
      const spy = mockCall(expected);

      const result = await api.writeUserChatMessage(params);

      expect(spy).toHaveBeenCalledWith("writeUserChatMessage", params, accessToken);
      expect(result).toEqual(expected);
    });

    it("writeUserChatMessageAsManager should call with correct method and params", async () => {
      const params: WriteUserChatMessageAsManagerRequest = {
        channelId: "ch-1",
        userChatId: "uc-1",
        dto: { plainText: "Manager reply", managerId: "manager-1" },
      };
      const expected = { message: { id: "msg-manager-userchat" } };
      const spy = mockCall(expected);

      const result = await api.writeUserChatMessageAsManager(params);

      expect(spy).toHaveBeenCalledWith("writeUserChatMessageAsManager", params, accessToken);
      expect(result).toEqual(expected);
    });

    it("writeUserChatMessageAsUser should call with correct method and params", async () => {
      const params: WriteUserChatMessageAsUserRequest = {
        channelId: "ch-1",
        userChatId: "uc-1",
        dto: { plainText: "User reply", userId: "user-1" },
      };
      const expected = { message: { id: "msg-user" } };
      const spy = mockCall(expected);

      const result = await api.writeUserChatMessageAsUser(params);

      expect(spy).toHaveBeenCalledWith("writeUserChatMessageAsUser", params, accessToken);
      expect(result).toEqual(expected);
    });

    it("writeDirectChatMessageAsManager should call with correct method and params", async () => {
      const params: WriteDirectChatMessageAsManagerRequest = {
        directChatId: "dc-1",
        channelId: "ch-1",
        dto: { plainText: "DM", managerId: "manager-1" },
      };
      const expected = { message: { id: "msg-4" } };
      const spy = mockCall(expected);

      const result = await api.writeDirectChatMessageAsManager(params);

      expect(spy).toHaveBeenCalledWith("writeDirectChatMessageAsManager", params, accessToken);
      expect(result).toEqual(expected);
    });

    it("patchMessage should call with correct method and params", async () => {
      const params: PatchMessageRequest = {
        channelId: "ch-1",
        chatId: "chat-1",
        chatType: "group",
        messageId: "msg-1",
        body: { options: ["MESSAGE_OPTION_PRIVATE"], state: "MESSAGE_STATE_SENT" },
        updateMask: ["options", "state"],
      };
      const expected = { message: { id: "msg-1", state: "MESSAGE_STATE_SENT" } };
      const spy = mockCall(expected);

      const result = await api.patchMessage(params);

      expect(spy).toHaveBeenCalledWith("patchMessage", params, accessToken);
      expect(result).toEqual(expected);
    });
  });

  // ============================================
  // Manager API
  // ============================================

  describe("Manager API", () => {
    it("getManager should call with correct method and params", async () => {
      const params: GetManagerRequest = {
        channelId: "ch-1",
        managerId: "mgr-1",
      };
      const expected = { manager: { id: "mgr-1", name: "Alice" } };
      const spy = mockCall(expected);

      const result = await api.getManager(params);

      expect(spy).toHaveBeenCalledWith("getManager", params, accessToken);
      expect(result).toEqual(expected);
    });

    it("batchGetManagers should call with correct method and params", async () => {
      const params: BatchGetManagersRequest = {
        channelId: "ch-1",
        managerIds: ["mgr-1", "mgr-2"],
      };
      const expected = {
        managers: [
          { id: "mgr-1", name: "Alice" },
          { id: "mgr-2", name: "Bob" },
        ],
      };
      const spy = mockCall(expected);

      const result = await api.batchGetManagers(params);

      expect(spy).toHaveBeenCalledWith("batchGetManagers", params, accessToken);
      expect(result).toEqual(expected);
    });

    it("searchManagers should call with correct method and params", async () => {
      const params: SearchManagersRequest = {
        channelId: "ch-1",
        pagination: { limit: 10 },
      };
      const expected = {
        managers: [{ id: "mgr-1", name: "Alice" }],
        next: "cursor-abc",
      };
      const spy = mockCall(expected);

      const result = await api.searchManagers(params);

      expect(spy).toHaveBeenCalledWith("searchManagers", params, accessToken);
      expect(result).toEqual(expected);
    });
  });

  // ============================================
  // User API
  // ============================================

  describe("User API", () => {
    it("getUser should call with correct method and params", async () => {
      const params: GetUserRequest = {
        channelId: "ch-1",
        userId: "user-1",
      };
      const expected = { user: { id: "user-1", name: "Charlie" } };
      const spy = mockCall(expected);

      const result = await api.getUser(params);

      expect(spy).toHaveBeenCalledWith("getUser", params, accessToken);
      expect(result).toEqual(expected);
    });

    it("searchUser should call with correct method and params", async () => {
      const params: SearchUserRequest = {
        channelId: "ch-1",
        memberId: "member-1",
      };
      const expected = { user: { id: "user-1", memberId: "member-1" } };
      const spy = mockCall(expected);

      const result = await api.searchUser(params);

      expect(spy).toHaveBeenCalledWith("searchUser", params, accessToken);
      expect(result).toEqual(expected);
    });

    it("patchUser should call with correct method and params", async () => {
      const params: PatchUserRequest = {
        channelId: "ch-1",
        userId: "user-1",
        body: {
          tags: ["vip", "premium"],
          blocked: false,
          profile: { company: "Acme" },
        },
        updateMask: ["tags", "blocked", "profile"],
      };
      const expected = { user: { id: "user-1", tags: ["vip", "premium"] } };
      const spy = mockCall(expected);

      const result = await api.patchUser(params);

      expect(spy).toHaveBeenCalledWith("patchUser", params, accessToken);
      expect(result).toEqual(expected);
    });
  });

  // ============================================
  // UserChat API
  // ============================================

  describe("UserChat API", () => {
    it("getUserChat should call with correct method and params", async () => {
      const params: GetUserChatRequest = {
        channelId: "ch-1",
        userChatId: "uc-1",
      };
      const expected = { userChat: { id: "uc-1", state: "opened" } };
      const spy = mockCall(expected);

      const result = await api.getUserChat(params);

      expect(spy).toHaveBeenCalledWith("getUserChat", params, accessToken);
      expect(result).toEqual(expected);
    });

    it("manageUserChat should call with correct method and params", async () => {
      const params: ManageUserChatRequest = {
        channelId: "ch-1",
        userChatId: "uc-1",
      };
      const expected = { userChat: { id: "uc-1", state: "managed" } };
      const spy = mockCall(expected);

      const result = await api.manageUserChat(params);

      expect(spy).toHaveBeenCalledWith("manageUserChat", params, accessToken);
      expect(result).toEqual(expected);
    });
  });

  // ============================================
  // Group API
  // ============================================

  describe("Group API", () => {
    it("getGroup should call with correct method and params", async () => {
      const params: GetGroupRequest = {
        channelId: "ch-1",
        groupId: "grp-1",
      };
      const expected = { group: { id: "grp-1", name: "General" } };
      const spy = mockCall(expected);

      const result = await api.getGroup(params);

      expect(spy).toHaveBeenCalledWith("getGroup", params, accessToken);
      expect(result).toEqual(expected);
    });

    it("searchGroups should call with correct method and params", async () => {
      const params: SearchGroupsRequest = {
        channelId: "ch-1",
        pagination: { limit: 20, since: "cursor-xyz" },
      };
      const expected = {
        groups: [{ id: "grp-1" }, { id: "grp-2" }],
        next: "cursor-next",
      };
      const spy = mockCall(expected);

      const result = await api.searchGroups(params);

      expect(spy).toHaveBeenCalledWith("searchGroups", params, accessToken);
      expect(result).toEqual(expected);
    });
  });

  // ============================================
  // Channel API
  // ============================================

  describe("Channel API", () => {
    it("getChannel should call with correct method and params", async () => {
      const params: GetChannelRequest = {
        channelId: "ch-1",
      };
      const expected = { channel: { id: "ch-1", name: "My Channel" } };
      const spy = mockCall(expected);

      const result = await api.getChannel(params);

      expect(spy).toHaveBeenCalledWith("getChannel", params, accessToken);
      expect(result).toEqual(expected);
    });
  });

  // ============================================
  // Error propagation
  // ============================================

  describe("Error handling", () => {
    it("should propagate errors from callNativeFunctionWithToken", async () => {
      vi.spyOn(client, "callNativeFunctionWithToken").mockRejectedValue(
        new Error("Native function call failed: 403 Forbidden")
      );

      await expect(api.getManager({ channelId: "ch-1", managerId: "mgr-1" })).rejects.toThrow(
        "Native function call failed: 403 Forbidden"
      );
    });
  });
});
