import type {
  CancelOAuthFlowParams,
  GetOAuthFlowParams,
  OAuthFlow,
  OAuthFlowResult,
  ResumeOAuthFlowParams,
} from "../gen/channel/app/sdk/v1/native.js";

export type NativeJsonObject = object;

export type NativeSortOrder =
  "SORT_ORDER_UNSPECIFIED" | "SORT_ORDER_ASC" | "SORT_ORDER_DESC" | "SORT_ORDER_BOTH";

export interface NativePagination {
  sortOrder?: NativeSortOrder;
  since?: string;
  limit?: number;
}

export interface NativeDuration {
  seconds?: number | string;
  nanos?: number;
}

export type NativeMessageOption =
  | "MESSAGE_OPTION_UNSPECIFIED"
  | "MESSAGE_OPTION_ACT_AS_MANAGER"
  | "MESSAGE_OPTION_DISPLAY_AS_CHANNEL"
  | "MESSAGE_OPTION_DO_NOT_POST"
  | "MESSAGE_OPTION_DO_NOT_SEARCH"
  | "MESSAGE_OPTION_DO_NOT_SEND_APP"
  | "MESSAGE_OPTION_DO_NOT_UPDATE_DESK"
  | "MESSAGE_OPTION_IMMUTABLE"
  | "MESSAGE_OPTION_PRIVATE"
  /** Deprecated in core API, retained for wire compatibility. */
  | "MESSAGE_OPTION_SILENT"
  | "MESSAGE_OPTION_SILENT_TO_MANAGER"
  | "MESSAGE_OPTION_SILENT_TO_USER";

export type NativeMessageColorVariant =
  | "MESSAGE_COLOR_VARIANT_UNSPECIFIED"
  | "MESSAGE_COLOR_VARIANT_COBALT"
  | "MESSAGE_COLOR_VARIANT_GREEN"
  | "MESSAGE_COLOR_VARIANT_ORANGE"
  | "MESSAGE_COLOR_VARIANT_RED"
  | "MESSAGE_COLOR_VARIANT_BLACK"
  | "MESSAGE_COLOR_VARIANT_PINK"
  | "MESSAGE_COLOR_VARIANT_PURPLE";

export type NativeUserChatState =
  | "USER_CHAT_STATE_UNSPECIFIED"
  | "USER_CHAT_STATE_CLOSED"
  | "USER_CHAT_STATE_OPENED"
  | "USER_CHAT_STATE_SNOOZED"
  | "USER_CHAT_STATE_INITIAL"
  | "USER_CHAT_STATE_MISSED"
  | "USER_CHAT_STATE_QUEUED";

export type NativeUserChatDesiredAlfTurnMode =
  | "USER_CHAT_DESIRED_ALF_TURN_MODE_UNSPECIFIED"
  | "USER_CHAT_DESIRED_ALF_TURN_MODE_SINGLE"
  | "USER_CHAT_DESIRED_ALF_TURN_MODE_MULTIPLE";

export type NativeOperatorType =
  | "OPERATOR_TYPE_UNSPECIFIED"
  | "OPERATOR_TYPE_BOOLEAN"
  | "OPERATOR_TYPE_DATE"
  | "OPERATOR_TYPE_DATETIME"
  | "OPERATOR_TYPE_LIST_OF_STRING"
  | "OPERATOR_TYPE_LIST_OF_NUMBER"
  | "OPERATOR_TYPE_NUMBER"
  | "OPERATOR_TYPE_STRING"
  | "OPERATOR_TYPE_LIST_OF_OBJECT";

export interface NativeAppDataTableColumn {
  key: string;
  name: string;
  type: NativeOperatorType;
  nullable?: boolean;
  description?: string;
}

export interface NativeAppDataTableSchema {
  channelId?: string;
  appId?: string;
  tableName: string;
  columns: readonly NativeAppDataTableColumn[];
  primaryKeyColumns?: readonly string[];
}

export interface NativeOpaqueModel {
  id?: string;
  [key: string]: unknown;
}

export interface NativeContact extends NativeOpaqueModel {
  id: string;
  channelId?: string;
  userId?: string;
  mediumType?: string;
  address?: string;
}

export interface NativeUser extends NativeOpaqueModel {
  id: string;
}

export interface NativeUserChat extends NativeOpaqueModel {
  id: string;
}

export interface NativeMessage extends NativeOpaqueModel {
  id?: string;
}

export interface NativeManager extends NativeOpaqueModel {
  id: string;
}

export interface NativeGroup extends NativeOpaqueModel {
  id: string;
}

export interface NativeDirectChat extends NativeOpaqueModel {
  id: string;
}

export interface NativeChannel extends NativeOpaqueModel {
  id: string;
}

export type NativeProxyMessage = NativeMessage;

export type NativeProxyManager = NativeManager;

export type NativeProxyUser = NativeUser;

export type NativeProxyUserChat = NativeUserChat;

export type NativeProxyGroup = NativeGroup;

export type NativeProxyChannel = NativeChannel;

export interface NativeMessageButton {
  title?: string;
  colorVariant?: NativeMessageColorVariant;
  action?: NativeJsonObject;
  [key: string]: unknown;
}

export interface NativeMessageFile {
  url?: string;
  mime?: string;
  fileName?: string;
  [key: string]: unknown;
}

export type NativeProxyMessageButton = NativeMessageButton;

export type NativeProxyMessageFile = NativeMessageFile;

export type NativeProxyMessageOption = NativeMessageOption;

export interface NativeWriteMessageDto {
  blocks?: readonly NativeJsonObject[];
  plainText?: string;
  buttons?: readonly NativeMessageButton[];
  files?: readonly NativeMessageFile[];
  webPage?: NativeJsonObject;
  form?: NativeJsonObject;
  options?: readonly NativeMessageOption[];
  requestId?: string;
  botName?: string;
  /** Display-only snapshot for writeGroupMessage; requires an existing botName.
   * Never creates/updates a bot or grants manager identity. Name <= 128 UTF-16 units.
   * Avatar accepts permanent app media CDN URLs; legacy allowed Slack image URLs remain supported.
   */
  externalSenderProfile?: { key: string; displayName: string; avatarUrl?: string };
  managerId?: string;
  userId?: string;
  customPayload?: NativeJsonObject;
}

export type NativeWriteMessageDtoAsManager = NativeWriteMessageDto & {
  managerId: string;
};

export type NativeWriteMessageDtoAsUser = NativeWriteMessageDto & {
  userId: string;
};

export interface NativeWriteGroupMessageParams {
  channelId: string;
  groupId: string;
  rootMessageId?: string;
  broadcast?: boolean;
  dto: NativeWriteMessageDto;
}

export interface NativeWriteGroupMessageResult {
  message: NativeMessage;
}

export interface NativeWriteGroupMessageAsManagerParams {
  channelId: string;
  groupId: string;
  rootMessageId?: string;
  broadcast?: boolean;
  dto: NativeWriteMessageDtoAsManager;
}

export type NativeWriteGroupMessageAsManagerResult = NativeWriteGroupMessageResult;

export interface NativeWriteUserChatMessageParams {
  channelId: string;
  userChatId: string;
  dto: NativeWriteMessageDto;
}

export interface NativeWriteUserChatMessageResult {
  message: NativeMessage;
}

export interface NativeWriteUserChatMessageAsManagerParams {
  channelId: string;
  userChatId: string;
  dto: NativeWriteMessageDtoAsManager;
}

export type NativeWriteUserChatMessageAsManagerResult = NativeWriteUserChatMessageResult;

export interface NativeWriteUserChatMessageAsUserParams {
  channelId: string;
  userChatId: string;
  dto: NativeWriteMessageDtoAsUser;
}

export type NativeWriteUserChatMessageAsUserResult = NativeWriteUserChatMessageResult;

export interface NativeWriteDirectChatMessageAsManagerParams {
  directChatId: string;
  channelId: string;
  rootMessageId?: string;
  broadcast?: boolean;
  dto: NativeWriteMessageDtoAsManager;
}

export type NativeWriteDirectChatMessageAsManagerResult = NativeWriteUserChatMessageResult;

export interface NativeGetManagerParams {
  channelId: string;
  managerId: string;
}

export interface NativeGetManagerResult {
  manager: NativeManager;
}

export interface NativeBatchGetManagersParams {
  channelId: string;
  managerIds: readonly string[];
}

export interface NativeBatchGetManagersResult {
  managers: NativeManager[];
}

export interface NativeSearchManagersParams {
  channelId: string;
  pagination?: NativePagination;
}

export interface NativeSearchManagersResult {
  managers: NativeManager[];
  next?: string;
}

export interface NativeGetUserParams {
  channelId: string;
  userId: string;
}

export interface NativeGetUserResult {
  user: NativeUser;
}

export interface NativeGetUserChatParams {
  channelId: string;
  userChatId: string;
}

export interface NativeGetUserChatResult {
  userChat: NativeUserChat;
}

export interface NativeManageUserChatParams {
  channelId: string;
  userChatId: string;
}

export interface NativeManageUserChatResult {
  userChat: NativeUserChat;
}

export interface FindOrCreateUserChatByMediumParams {
  channelId: string;
  userId: string;
  mediumType: string;
  mediumId?: string;
  mediumTopicKey?: string;
  mediumTopicLabels?: readonly string[];
  mediumProfile?: NativeJsonObject;
  /** Deprecated by core API, retained for wire compatibility. */
  contactKey?: string;
  desiredAlfTurnMode?: NativeUserChatDesiredAlfTurnMode;
}

export interface FindOrCreateUserChatByMediumResult {
  userChat: NativeUserChat;
}

export interface NativeUpdateUserChatStateByUserParams {
  channelId: string;
  userChatId: string;
  state: NativeUserChatState;
  duration?: NativeDuration;
}

export interface NativeUpdateUserChatStateByUserResult {
  userChat: NativeUserChat;
}

// Channel App platform grants/routes this inbox messaging native function, but the
// inspected Channel Core API/Channel API contracts tree does not currently expose a request DTO,
// so keep this contract open until the canonical DTO is available.
export interface NativeSubmitHandlingWorkflowButtonParams {
  channelId: string;
  userChatId: string;
  messageId?: string;
  buttonId?: string;
  [key: string]: unknown;
}

export interface NativeSubmitHandlingWorkflowButtonResult {
  userChat?: NativeUserChat;
  [key: string]: unknown;
}

export interface FindOrCreateContactAndUserParams {
  channelId: string;
  mediumType: string;
  mediumId?: string;
  address: string;
  defaultMediumLanguage: string;
  userToken?: string;
}

export interface FindOrCreateContactAndUserResult {
  contact: NativeContact;
  user: NativeUser;
}

export interface NativeFindContactsByUserParams {
  channelId: string;
  userId: string;
  mediumType: string;
  mediumId?: string;
}

export interface NativeFindContactsByUserResult {
  contacts: NativeContact[];
}

export interface NativeFindOrCreateDirectChatParams {
  channelId: string;
  managerIds: readonly string[];
}

export interface NativeFindOrCreateDirectChatResult {
  directChat: NativeDirectChat;
}

export interface NativeGetGroupParams {
  channelId: string;
  groupId: string;
}

export interface NativeGetGroupResult {
  group: NativeGroup;
}

export interface NativeSearchGroupsParams {
  channelId: string;
  pagination?: NativePagination;
}

export interface NativeSearchGroupsResult {
  groups: NativeGroup[];
  next?: string;
}

export interface NativeGetChannelParams {
  channelId: string;
}

export interface NativeGetChannelResult {
  channel: NativeChannel;
}

export interface NativeCreateAppDataTableParams {
  appId: string;
  tableName: string;
  columns: readonly NativeAppDataTableColumn[];
  primaryKeyColumns?: readonly string[];
}

export interface NativeCreateAppDataTableResult {
  requestId: string;
}

export interface NativeCreateAppDataTableSchemaParams {
  channelId: string;
  appId: string;
  tableName: string;
  columns: readonly NativeAppDataTableColumn[];
  primaryKeyColumns?: readonly string[];
}

export interface NativeCreateAppDataTableSchemaResult {
  requestId: string;
  schema?: NativeAppDataTableSchema;
}

export interface NativeGetAppDataTableSchemaParams {
  channelId: string;
  appId: string;
  tableName: string;
}

export interface NativeGetAppDataTableSchemaResult {
  schema?: NativeAppDataTableSchema;
}

export interface NativeUpsertAppDataTableRowsParams {
  channelId: string;
  appId: string;
  tableName: string;
  rows: readonly NativeJsonObject[];
}

export interface NativeUpsertAppDataTableRowsResult {
  requestId: string;
  acceptedRowCount: number;
}

export interface NativeGetAppNotebookVersionsParams {
  appId: string;
}

export interface NativeAppNotebookVersion {
  notebookKey: string;
  version: number;
  latestRevisionId?: string;
  updatedAt?: string;
}

export interface NativeGetAppNotebookVersionsResult {
  success: boolean;
  errorMessage?: string;
  notebooks: NativeAppNotebookVersion[];
}

export interface NativeActiveOAuthManagerTarget {
  channelId: string;
  managerId: string;
}

export interface NativeListActiveOAuthManagerTargetsParams {
  cursor?: string;
  limit: number;
}

export interface NativeListActiveOAuthManagerTargetsResult {
  targets: readonly NativeActiveOAuthManagerTarget[];
  nextCursor?: string;
}

/** Manager-authenticated flow state. No provider credentials are returned. */
export interface NativeOAuthFlow extends OAuthFlow {
  id: string;
  phase: "before" | "oauth" | "after" | "completed" | "canceled";
  expiresAt: string;
}

export interface NativeGetOAuthFlowParams extends GetOAuthFlowParams {
  flowId: string;
}

export interface NativeResumeOAuthFlowParams extends ResumeOAuthFlowParams {
  flowId: string;
}

export interface NativeCancelOAuthFlowParams extends CancelOAuthFlowParams {
  flowId: string;
}

export interface NativeOAuthFlowResult extends OAuthFlowResult {
  flow?: NativeOAuthFlow;
}
export interface NativeFunctionTypeMap {
  getOAuthFlow: {
    params: NativeGetOAuthFlowParams;
    result: NativeOAuthFlowResult;
  };
  resumeOAuthFlow: {
    params: NativeResumeOAuthFlowParams;
    result: NativeOAuthFlowResult;
  };
  cancelOAuthFlow: {
    params: NativeCancelOAuthFlowParams;
    result: NativeOAuthFlowResult;
  };
  writeGroupMessage: {
    params: NativeWriteGroupMessageParams;
    result: NativeWriteGroupMessageResult;
  };
  writeUserChatMessage: {
    params: NativeWriteUserChatMessageParams;
    result: NativeWriteUserChatMessageResult;
  };
  getManager: {
    params: NativeGetManagerParams;
    result: NativeGetManagerResult;
  };
  batchGetManagers: {
    params: NativeBatchGetManagersParams;
    result: NativeBatchGetManagersResult;
  };
  searchManagers: {
    params: NativeSearchManagersParams;
    result: NativeSearchManagersResult;
  };
  getUserChat: {
    params: NativeGetUserChatParams;
    result: NativeGetUserChatResult;
  };
  getUser: {
    params: NativeGetUserParams;
    result: NativeGetUserResult;
  };
  getChannel: {
    params: NativeGetChannelParams;
    result: NativeGetChannelResult;
  };
  manageUserChat: {
    params: NativeManageUserChatParams;
    result: NativeManageUserChatResult;
  };
  writeGroupMessageAsManager: {
    params: NativeWriteGroupMessageAsManagerParams;
    result: NativeWriteGroupMessageAsManagerResult;
  };
  writeUserChatMessageAsManager: {
    params: NativeWriteUserChatMessageAsManagerParams;
    result: NativeWriteUserChatMessageAsManagerResult;
  };
  writeDirectChatMessageAsManager: {
    params: NativeWriteDirectChatMessageAsManagerParams;
    result: NativeWriteDirectChatMessageAsManagerResult;
  };
  writeUserChatMessageAsUser: {
    params: NativeWriteUserChatMessageAsUserParams;
    result: NativeWriteUserChatMessageAsUserResult;
  };
  findOrCreateDirectChat: {
    params: NativeFindOrCreateDirectChatParams;
    result: NativeFindOrCreateDirectChatResult;
  };
  getGroup: {
    params: NativeGetGroupParams;
    result: NativeGetGroupResult;
  };
  searchGroups: {
    params: NativeSearchGroupsParams;
    result: NativeSearchGroupsResult;
  };
  findOrCreateUserChatByMedium: {
    params: FindOrCreateUserChatByMediumParams;
    result: FindOrCreateUserChatByMediumResult;
  };
  submitHandlingWorkflowButton: {
    params: NativeSubmitHandlingWorkflowButtonParams;
    result: NativeSubmitHandlingWorkflowButtonResult;
  };
  updateUserChatStateByUser: {
    params: NativeUpdateUserChatStateByUserParams;
    result: NativeUpdateUserChatStateByUserResult;
  };
  findContactsByUser: {
    params: NativeFindContactsByUserParams;
    result: NativeFindContactsByUserResult;
  };
  findOrCreateContactAndUser: {
    params: FindOrCreateContactAndUserParams;
    result: FindOrCreateContactAndUserResult;
  };
  createAppDataTable: {
    params: NativeCreateAppDataTableParams;
    result: NativeCreateAppDataTableResult;
  };
  createAppDataTableSchema: {
    params: NativeCreateAppDataTableSchemaParams;
    result: NativeCreateAppDataTableSchemaResult;
  };
  getAppDataTableSchema: {
    params: NativeGetAppDataTableSchemaParams;
    result: NativeGetAppDataTableSchemaResult;
  };
  upsertAppDataTableRows: {
    params: NativeUpsertAppDataTableRowsParams;
    result: NativeUpsertAppDataTableRowsResult;
  };
  getAppNotebookVersions: {
    params: NativeGetAppNotebookVersionsParams;
    result: NativeGetAppNotebookVersionsResult;
  };
  listActiveOAuthManagerTargets: {
    params: NativeListActiveOAuthManagerTargetsParams;
    result: NativeListActiveOAuthManagerTargetsResult;
  };
}

export type NativeFunctionMethod = keyof NativeFunctionTypeMap;
export type NativeFunctionParams<TMethod extends NativeFunctionMethod> =
  NativeFunctionTypeMap[TMethod]["params"];
export type NativeFunctionResult<TMethod extends NativeFunctionMethod> =
  NativeFunctionTypeMap[TMethod]["result"];
