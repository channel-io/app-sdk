/**
 * Typed ProxyAPI wrappers for Channel Talk core API
 *
 * These methods wrap `callNativeFunctionWithToken` for proxy native functions
 * that route through Channel App platform to Channel Core API's REST API.
 *
 * These operations require an access token.
 *
 * @example
 * ```typescript
 * import { NativeFunctionClient } from '@channel.io/app-sdk-server';
 *
 * const client = new NativeFunctionClient({
 *   appId: process.env.APP_ID!,
 *   appSecret: process.env.APP_SECRET!,
 * });
 *
 * // Issue a token first
 * const { accessToken } = await client.issueToken({ channelId: 'ch-123' });
 *
 * // Create proxy API with the token
 * const api = client.createProxyApi(accessToken);
 *
 * // Use typed methods
 * const { message } = await api.writeGroupMessage({
 *   channelId: 'ch-123',
 *   groupId: 'group-456',
 *   dto: { plainText: 'Hello!' },
 * });
 *
 * const { manager } = await api.getManager({
 *   channelId: 'ch-123',
 *   managerId: 'mgr-789',
 * });
 * ```
 */

import type { NativeFunctionClient } from "./client.js";
import type {
  PatchMessageRequest,
  PatchMessageResult,
  WriteGroupMessageRequest,
  WriteGroupMessageResult,
  WriteGroupMessageAsManagerRequest,
  WriteGroupMessageAsManagerResult,
  WriteUserChatMessageRequest,
  WriteUserChatMessageResult,
  WriteUserChatMessageAsManagerRequest,
  WriteUserChatMessageAsManagerResult,
  WriteUserChatMessageAsUserRequest,
  WriteUserChatMessageAsUserResult,
  WriteDirectChatMessageAsManagerRequest,
  WriteDirectChatMessageAsManagerResult,
  GetManagerRequest,
  GetManagerResult,
  BatchGetManagersRequest,
  BatchGetManagersResult,
  SearchManagersRequest,
  SearchManagersResult,
  GetUserRequest,
  GetUserResult,
  GetUserChatRequest,
  GetUserChatResult,
  ManageUserChatRequest,
  ManageUserChatResult,
  GetGroupRequest,
  GetGroupResult,
  SearchGroupsRequest,
  SearchGroupsResult,
  GetChannelRequest,
  GetChannelResult,
} from "./proxy-api.types.js";

/**
 * Typed wrapper for Channel Talk ProxyAPI native functions.
 *
 * All methods require an access token.
 * Use `NativeFunctionClient.createProxyApi(accessToken)` to create an instance.
 */
export class ProxyApi {
  constructor(
    private readonly client: NativeFunctionClient,
    private readonly accessToken: string
  ) {}

  // ============================================
  // Message API
  // ============================================

  /**
   * Write a message to a team chat group
   */
  writeGroupMessage(params: WriteGroupMessageRequest): Promise<WriteGroupMessageResult> {
    return this.client.callNativeFunctionWithToken("writeGroupMessage", params, this.accessToken);
  }

  /**
   * Write a message to a team chat group as a manager
   */
  writeGroupMessageAsManager(
    params: WriteGroupMessageAsManagerRequest
  ): Promise<WriteGroupMessageAsManagerResult> {
    return this.client.callNativeFunctionWithToken(
      "writeGroupMessageAsManager",
      params,
      this.accessToken
    );
  }

  /**
   * Write a message to a user chat
   */
  writeUserChatMessage(params: WriteUserChatMessageRequest): Promise<WriteUserChatMessageResult> {
    return this.client.callNativeFunctionWithToken(
      "writeUserChatMessage",
      params,
      this.accessToken
    );
  }

  /**
   * Write a message to a user chat as a manager
   */
  writeUserChatMessageAsManager(
    params: WriteUserChatMessageAsManagerRequest
  ): Promise<WriteUserChatMessageAsManagerResult> {
    return this.client.callNativeFunctionWithToken(
      "writeUserChatMessageAsManager",
      params,
      this.accessToken
    );
  }

  /**
   * Write a message to a user chat as a user
   */
  writeUserChatMessageAsUser(
    params: WriteUserChatMessageAsUserRequest
  ): Promise<WriteUserChatMessageAsUserResult> {
    return this.client.callNativeFunctionWithToken(
      "writeUserChatMessageAsUser",
      params,
      this.accessToken
    );
  }

  /**
   * Write a direct chat message as a manager
   */
  writeDirectChatMessageAsManager(
    params: WriteDirectChatMessageAsManagerRequest
  ): Promise<WriteDirectChatMessageAsManagerResult> {
    return this.client.callNativeFunctionWithToken(
      "writeDirectChatMessageAsManager",
      params,
      this.accessToken
    );
  }

  /** Patch message delivery status with an explicitly granted channel permission. */
  patchMessage(params: PatchMessageRequest): Promise<PatchMessageResult> {
    return this.client.callNativeFunctionWithToken("patchMessage", params, this.accessToken);
  }

  // ============================================
  // Manager API
  // ============================================

  /**
   * Get a single manager by ID
   */
  getManager(params: GetManagerRequest): Promise<GetManagerResult> {
    return this.client.callNativeFunctionWithToken("getManager", params, this.accessToken);
  }

  /**
   * Batch get multiple managers by IDs (max 50)
   */
  batchGetManagers(params: BatchGetManagersRequest): Promise<BatchGetManagersResult> {
    return this.client.callNativeFunctionWithToken("batchGetManagers", params, this.accessToken);
  }

  /**
   * Search managers with optional pagination
   */
  searchManagers(params: SearchManagersRequest): Promise<SearchManagersResult> {
    return this.client.callNativeFunctionWithToken("searchManagers", params, this.accessToken);
  }

  // ============================================
  // User API
  // ============================================

  /**
   * Get a single user by ID
   */
  getUser(params: GetUserRequest): Promise<GetUserResult> {
    return this.client.callNativeFunctionWithToken("getUser", params, this.accessToken);
  }

  // ============================================
  // UserChat API
  // ============================================

  /**
   * Get a user chat by ID
   */
  getUserChat(params: GetUserChatRequest): Promise<GetUserChatResult> {
    return this.client.callNativeFunctionWithToken("getUserChat", params, this.accessToken);
  }

  /**
   * Manage (assign) a user chat
   */
  manageUserChat(params: ManageUserChatRequest): Promise<ManageUserChatResult> {
    return this.client.callNativeFunctionWithToken("manageUserChat", params, this.accessToken);
  }

  // ============================================
  // Group API
  // ============================================

  /**
   * Get a team chat group by ID
   */
  getGroup(params: GetGroupRequest): Promise<GetGroupResult> {
    return this.client.callNativeFunctionWithToken("getGroup", params, this.accessToken);
  }

  /**
   * Search groups with optional pagination
   */
  searchGroups(params: SearchGroupsRequest): Promise<SearchGroupsResult> {
    return this.client.callNativeFunctionWithToken("searchGroups", params, this.accessToken);
  }

  // ============================================
  // Channel API
  // ============================================

  /**
   * Get channel information
   */
  getChannel(params: GetChannelRequest): Promise<GetChannelResult> {
    return this.client.callNativeFunctionWithToken("getChannel", params, this.accessToken);
  }
}
