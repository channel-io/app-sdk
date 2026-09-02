export type NativeJsonObject = object;
export type NativeEmptyResult = Record<string, never>;

export type NativeSortOrder =
  "SORT_ORDER_UNSPECIFIED" | "SORT_ORDER_ASC" | "SORT_ORDER_DESC" | "SORT_ORDER_BOTH";

export interface NativePagination {
  sortOrder?: NativeSortOrder;
  since?: string;
  limit?: number;
}

export type NativeFieldMask =
  | string
  | readonly string[]
  | {
      paths: readonly string[];
    };

export interface NativeDuration {
  seconds?: number | string;
  nanos?: number;
}

export type NativeMessageState =
  | "MESSAGE_STATE_UNSPECIFIED"
  | "MESSAGE_STATE_SENDING"
  | "MESSAGE_STATE_SENT"
  | "MESSAGE_STATE_FAILED"
  | "MESSAGE_STATE_REMOVED";

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

export interface NativePlugin extends NativeOpaqueModel {
  id: string;
}

export interface NativeRole extends NativeOpaqueModel {
  id: string;
}

// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface NativeEntityToken extends NativeOpaqueModel {}
// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface NativeMediumLink extends NativeOpaqueModel {}
// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface NativeEvent extends NativeOpaqueModel {}
// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface NativeUserSchema extends NativeOpaqueModel {}
// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface NativeUserChatSchema extends NativeOpaqueModel {}
// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface NativeEventSchema extends NativeOpaqueModel {}

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

export interface NativeWritePrivateNoteDto {
  blocks?: readonly NativeJsonObject[];
  plainText?: string;
  customPayload?: NativeJsonObject;
}

export interface NativeWriteUserChatPrivateNoteWithManagerCredentialParams {
  channelId: string;
  userChatId: string;
  requestId: string;
  lifecycleRevision: number;
  dto: NativeWritePrivateNoteDto;
}

export type NativeWriteUserChatPrivateNoteWithManagerCredentialResult =
  NativeWriteUserChatMessageResult;

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

export interface NativePatchMessageBody {
  options?: readonly NativeMessageOption[];
  state?: NativeMessageState;
}

export interface NativePatchMessageParams {
  channelId: string;
  chatId: string;
  chatType: string;
  messageId: string;
  body: NativePatchMessageBody;
  updateMask: NativeFieldMask;
}

export interface NativePatchMessageResult {
  message: NativeMessage;
}

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

export interface NativeSearchUserParams {
  channelId: string;
  memberId: string;
}

export interface NativeSearchUserResult {
  user: NativeUser;
}

export interface NativeUserPatchBody {
  mobileNumberQualified?: boolean;
  emailQualified?: boolean;
  profile?: NativeJsonObject;
  profileOnce?: NativeJsonObject;
  tags?: readonly string[];
  blocked?: boolean;
  unsubscribeEmail?: boolean;
  unsubscribeTexting?: boolean;
  language?: string;
}

export interface NativePatchUserParams {
  channelId: string;
  userId: string;
  body: NativeUserPatchBody;
  updateMask: NativeFieldMask;
}

export interface NativePatchUserResult {
  user: NativeUser;
}

export interface NativeCreateLeadParams {
  channelId: string;
  profile: NativeJsonObject;
}

export interface NativeCreateLeadResult {
  user: NativeUser;
}

export interface NativeCreateUserParams {
  channelId: string;
  profile: NativeJsonObject;
}

export interface NativeCreateUserResult {
  user: NativeUser;
}

export interface NativeUpsertMemberParams {
  channelId: string;
  memberId: string;
  body: NativeUserPatchBody;
  updateMask: NativeFieldMask;
}

export interface NativeUpsertMemberResult {
  user: NativeUser;
}

export interface NativeDeleteUserParams {
  channelId: string;
  userId: string;
}

export type NativeDeleteUserResult = NativeEmptyResult;

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

export interface NativeCreateUserChatParams {
  channelId: string;
  userId: string;
}

export interface NativeCreateUserChatResult {
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

export interface NativeSearchUserChatsByContactParams {
  channelId: string;
  mediumType: string;
  mediumId?: string;
  address: string;
  pagination?: NativePagination;
}

export interface NativeSearchUserChatsByContactResult {
  userChats: NativeUserChat[];
  next?: string;
}

export interface NativeSearchUserChatsByMediumParams {
  userId: string;
  mediumType: string;
  mediumId?: string;
  mediumTopicKey?: string;
}

export interface NativeSearchUserChatsByMediumResult {
  userChats: NativeUserChat[];
}

export interface NativeUpdateUserChatStateParams {
  channelId: string;
  userChatId: string;
  state: NativeUserChatState;
  duration?: NativeDuration;
  botName: string;
}

export interface NativeUpdateUserChatStateResult {
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

export interface NativeStartUserChatFromUserByMediumParams {
  channelId: string;
  userChatId: string;
  mediumType: string;
  mediumId?: string;
  useQuickDeploy?: boolean;
  showWelcomeMessage?: boolean;
  tryOpen?: boolean;
}

export interface NativeStartUserChatFromUserByMediumResult {
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

export interface NativeFindContactsByAddressParams {
  channelId: string;
  mediumType: string;
  mediumId?: string;
  address: string;
}

export interface NativeFindContactsByAddressResult {
  contacts: NativeContact[];
}

export interface NativeCreateDirectChatParams {
  channelId: string;
  managerIds: readonly string[];
}

export interface NativeCreateDirectChatResult {
  directChat: NativeDirectChat;
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

export interface NativeGetPluginParams {
  channelId: string;
  pluginId: string;
}

export interface NativeGetPluginResult {
  plugin: NativePlugin;
}

export interface NativeAppCommerceParams {
  appCommerceType: string;
  appCommerceId: string;
  appCommerceDomain?: string;
}

export interface NativeRegisterCommerceParams {
  channelId: string;
  pluginId: string;
  memberHash?: boolean;
  appCommerce: NativeAppCommerceParams;
}

export interface NativeRegisterCommerceResult {
  channel: NativeChannel;
  plugin: NativePlugin;
}

export interface NativeDeregisterCommerceParams {
  channelId: string;
  pluginId: string;
  appCommerce: NativeAppCommerceParams;
}

export type NativeDeregisterCommerceResult = NativeEmptyResult;

export interface NativeCreateEventParams {
  channelId: string;
  userId: string;
  name: string;
  property?: NativeJsonObject;
}

export interface NativeCreateEventResult {
  event: NativeEvent;
}

export interface NativeCreateMediumLinkParams {
  channelId: string;
  mediumId?: string;
  mediumType: string;
}

export interface NativeCreateMediumLinkResult {
  mediumLink: NativeMediumLink;
}

export interface NativeDeleteMediumLinkParams {
  channelId: string;
  mediumId?: string;
  mediumType: string;
}

export type NativeDeleteMediumLinkResult = NativeEmptyResult;

export interface NativeGetRoleParams {
  channelId: string;
  roleId: string;
}

export interface NativeGetRoleResult {
  role: NativeRole;
}

export interface NativeSearchUserChatSchemasParams {
  channelId: string;
  pagination?: NativePagination;
}

export interface NativeSearchUserChatSchemasResult {
  schemas: NativeUserChatSchema[];
  next?: string;
}

export interface NativeSearchUserSchemasParams {
  channelId: string;
  pagination?: NativePagination;
}

export interface NativeSearchUserSchemasResult {
  schemas: NativeUserSchema[];
  next?: string;
}

export interface NativeSearchEventSchemasByEventNameParams {
  channelId: string;
  eventName: string;
  pagination?: NativePagination;
}

export interface NativeSearchEventSchemasByEventNameResult {
  schemas: NativeEventSchema[];
  next?: string;
}

export interface NativeAppSchemaDto {
  key: string;
  type?: NativeOperatorType;
  name: string;
  defaultWatch?: boolean;
  defaultWidth?: number;
}

export interface NativeCreateAppSchemasParams {
  channelId: string;
  schemas: readonly NativeAppSchemaDto[];
}

export interface NativeCreateAppSchemasResult {
  schemas: NativeUserSchema[];
  skippedKeys: string[];
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

export interface NativePrepareAppMediaUploadParams {
  managerId?: string;
  fileName: string;
  contentType?: string;
  size?: number;
}

export interface NativeAppMediaUploadTarget {
  uploadUrl: string;
  uploadMethod: string;
  headers: Record<string, string>;
  bodyType?: string;
  fileField?: string;
  fileName?: string;
  formFields: Record<string, string>;
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

export interface NativeIssueEntityTokenParams {
  channelId: string;
  entityType: string;
  entityId: string;
}

export interface NativeIssueEntityTokenResult {
  entityToken: NativeEntityToken;
}

// Channel App platform also routes document native functions (`searchArticles`,
// `getRevision`, `getArticle`), but they are intentionally omitted here until
// the document-api request/result DTOs are modeled in this SDK.
export interface NativeFunctionTypeMap {
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
  writeUserChatPrivateNoteWithManagerCredential: {
    params: NativeWriteUserChatPrivateNoteWithManagerCredentialParams;
    result: NativeWriteUserChatPrivateNoteWithManagerCredentialResult;
  };
  writeDirectChatMessageAsManager: {
    params: NativeWriteDirectChatMessageAsManagerParams;
    result: NativeWriteDirectChatMessageAsManagerResult;
  };
  writeUserChatMessageAsUser: {
    params: NativeWriteUserChatMessageAsUserParams;
    result: NativeWriteUserChatMessageAsUserResult;
  };
  createDirectChat: {
    params: NativeCreateDirectChatParams;
    result: NativeCreateDirectChatResult;
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
  searchUser: {
    params: NativeSearchUserParams;
    result: NativeSearchUserResult;
  };
  createLead: {
    params: NativeCreateLeadParams;
    result: NativeCreateLeadResult;
  };
  createUser: {
    params: NativeCreateUserParams;
    result: NativeCreateUserResult;
  };
  patchUser: {
    params: NativePatchUserParams;
    result: NativePatchUserResult;
  };
  deleteUser: {
    params: NativeDeleteUserParams;
    result: NativeDeleteUserResult;
  };
  upsertMember: {
    params: NativeUpsertMemberParams;
    result: NativeUpsertMemberResult;
  };
  searchUserChatsByContact: {
    params: NativeSearchUserChatsByContactParams;
    result: NativeSearchUserChatsByContactResult;
  };
  updateUserChatState: {
    params: NativeUpdateUserChatStateParams;
    result: NativeUpdateUserChatStateResult;
  };
  createUserChat: {
    params: NativeCreateUserChatParams;
    result: NativeCreateUserChatResult;
  };
  findOrCreateUserChatByMedium: {
    params: FindOrCreateUserChatByMediumParams;
    result: FindOrCreateUserChatByMediumResult;
  };
  submitHandlingWorkflowButton: {
    params: NativeSubmitHandlingWorkflowButtonParams;
    result: NativeSubmitHandlingWorkflowButtonResult;
  };
  searchUserChatsByMedium: {
    params: NativeSearchUserChatsByMediumParams;
    result: NativeSearchUserChatsByMediumResult;
  };
  updateUserChatStateByUser: {
    params: NativeUpdateUserChatStateByUserParams;
    result: NativeUpdateUserChatStateByUserResult;
  };
  startUserChatFromUserByMedium: {
    params: NativeStartUserChatFromUserByMediumParams;
    result: NativeStartUserChatFromUserByMediumResult;
  };
  patchMessage: {
    params: NativePatchMessageParams;
    result: NativePatchMessageResult;
  };
  getPlugin: {
    params: NativeGetPluginParams;
    result: NativeGetPluginResult;
  };
  registerCommerce: {
    params: NativeRegisterCommerceParams;
    result: NativeRegisterCommerceResult;
  };
  deregisterCommerce: {
    params: NativeDeregisterCommerceParams;
    result: NativeDeregisterCommerceResult;
  };
  createEvent: {
    params: NativeCreateEventParams;
    result: NativeCreateEventResult;
  };
  findContactsByUser: {
    params: NativeFindContactsByUserParams;
    result: NativeFindContactsByUserResult;
  };
  findOrCreateContactAndUser: {
    params: FindOrCreateContactAndUserParams;
    result: FindOrCreateContactAndUserResult;
  };
  findContactsByAddress: {
    params: NativeFindContactsByAddressParams;
    result: NativeFindContactsByAddressResult;
  };
  createMediumLink: {
    params: NativeCreateMediumLinkParams;
    result: NativeCreateMediumLinkResult;
  };
  deleteMediumLink: {
    params: NativeDeleteMediumLinkParams;
    result: NativeDeleteMediumLinkResult;
  };
  getRole: {
    params: NativeGetRoleParams;
    result: NativeGetRoleResult;
  };
  searchUserChatSchemas: {
    params: NativeSearchUserChatSchemasParams;
    result: NativeSearchUserChatSchemasResult;
  };
  searchUserSchemas: {
    params: NativeSearchUserSchemasParams;
    result: NativeSearchUserSchemasResult;
  };
  searchEventSchemasByEventName: {
    params: NativeSearchEventSchemasByEventNameParams;
    result: NativeSearchEventSchemasByEventNameResult;
  };
  createAppSchemas: {
    params: NativeCreateAppSchemasParams;
    result: NativeCreateAppSchemasResult;
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
  prepareAppMediaUpload: {
    params: NativePrepareAppMediaUploadParams;
    result: NativeAppMediaUploadTarget;
  };
  listActiveOAuthManagerTargets: {
    params: NativeListActiveOAuthManagerTargetsParams;
    result: NativeListActiveOAuthManagerTargetsResult;
  };
  issueEntityToken: {
    params: NativeIssueEntityTokenParams;
    result: NativeIssueEntityTokenResult;
  };
}

export type NativeFunctionMethod = keyof NativeFunctionTypeMap;

export type NativeFunctionParams<TMethod extends NativeFunctionMethod> =
  NativeFunctionTypeMap[TMethod]["params"];

export type NativeFunctionResult<TMethod extends NativeFunctionMethod> =
  NativeFunctionTypeMap[TMethod]["result"];
