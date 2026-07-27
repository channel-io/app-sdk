import { z } from "zod";
import type {
  Alf as ProtoMessagingAlf,
  AlfMessageType as ProtoMessagingAlfMessageType,
  ChannelMessage as ProtoMessagingMessage,
  ChannelUser as ProtoMessagingUser,
  ChannelUserChat as ProtoMessagingUserChat,
  ChannelUserChatGoalState as ProtoMessagingUserChatGoalState,
  ChannelUserChatState as ProtoMessagingUserChatState,
  ChannelUserChatSubtextType as ProtoMessagingUserChatSubtextType,
  ChannelUserType as ProtoMessagingUserType,
  CustomPayload as ProtoMessagingCustomPayload,
  MediumProfile as ProtoMessagingMediumProfile,
  Meet as ProtoMessagingMeet,
  MeetMode as ProtoMessagingMeetMode,
  MessageAlertLevel as ProtoMessagingMessageAlertLevel,
  MessageButton as ProtoMessagingMessageButton,
  MessageColorVariant as ProtoMessagingMessageColorVariant,
  MessageFile as ProtoMessagingMessageFile,
  MessageMeetState as ProtoMessagingMessageMeetState,
  MessageOption as ProtoMessagingMessageOption,
  MessageState as ProtoMessagingMessageState,
  MessageThread as ProtoMessagingMessageThread,
  MissedReason as ProtoMessagingMissedReason,
  PrebuiltMessage as ProtoMessagingPrebuiltMessage,
  UnavailableReason as ProtoMessagingUnavailableReason,
  WamResult as ProtoMessagingWamResult,
  WritingType as ProtoMessagingWritingType,
  WritingTypeMap as ProtoMessagingWritingTypeMap,
  WritingTypeState as ProtoMessagingWritingTypeState,
} from "../gen/channel/app/sdk/v1/common.js";
import type {
  MessagingInboxGetCustomEditorWamInput as ProtoInboxGetCustomEditorWamInput,
  MessagingInboxGetMediumMessageErrorReasonInput as ProtoInboxGetMediumMessageErrorReasonInput,
  MessagingInboxGetMediumMessageErrorReasonOutput as ProtoInboxGetMediumMessageErrorReasonOutput,
  MessagingInboxGetMediumTopicSelectorWamInput as ProtoInboxGetMediumTopicSelectorWamInput,
  MessagingInboxGetWritingTypesInput as ProtoInboxGetWritingTypesInput,
  MessagingInboxGetWritingTypesOutput as ProtoInboxGetWritingTypesOutput,
  MessagingInboxOnMediumUserChatClosedInput as ProtoInboxOnMediumUserChatClosedInput,
  MessagingInboxOnMediumUserChatClosedOutput as ProtoInboxOnMediumUserChatClosedOutput,
  MessagingOnMediumMessageCreatedInput as ProtoOnMediumMessageCreatedInput,
  MessagingOnMediumMessageCreatedOutput as ProtoOnMediumMessageCreatedOutput,
  MessagingPrebuiltBuildMediumTopicsInput as ProtoPrebuiltBuildMediumTopicsInput,
  MessagingPrebuiltBuildMediumTopicsOutput as ProtoPrebuiltBuildMediumTopicsOutput,
  MessagingPrebuiltGetCustomEditorWamInput as ProtoPrebuiltGetCustomEditorWamInput,
  MessagingPrebuiltGetDefaultOptionsInput as ProtoPrebuiltGetDefaultOptionsInput,
  MessagingPrebuiltGetDefaultOptionsOutput as ProtoPrebuiltGetDefaultOptionsOutput,
  MessagingPrebuiltGetMediumTopicBuilderSelectorWamInput as ProtoPrebuiltGetMediumTopicBuilderSelectorWamInput,
  MessagingPrebuiltGetWritingTypesInput as ProtoPrebuiltGetWritingTypesInput,
  MessagingPrebuiltGetWritingTypesOutput as ProtoPrebuiltGetWritingTypesOutput,
  MessagingPrebuiltValidateEntityInput as ProtoPrebuiltValidateEntityInput,
  MessagingPrebuiltValidateEntityOutput as ProtoPrebuiltValidateEntityOutput,
} from "../gen/channel/app/sdk/v1/extension.js";
import type { Context } from "../types/context.js";
import type { ExtensionDefinition } from "../types/extension.js";
import type { FunctionDefinition } from "../types/function.js";

type ProtoBacked<T, Proto> = T & Proto;

const JsonObjectSchema = z.object({}).passthrough();
// Protobuf JSON serializes int64 values as decimal strings to avoid precision
// loss in JavaScript. These messaging counters/versions are non-negative in
// practice, so keep them as non-negative decimal strings instead of numbers.
const MessagingNonNegativeInt64StringSchema = z.string().regex(/^\d+$/);

export const MessagingAlfMessageTypeSchema = z.enum([
  "ALF_MESSAGE_TYPE_UNSPECIFIED",
  "ALF_MESSAGE_TYPE_COMPLETE",
  "ALF_MESSAGE_TYPE_RAG",
  "ALF_MESSAGE_TYPE_INCOMPLETE",
  "ALF_MESSAGE_TYPE_IMPOSSIBLE",
  "ALF_MESSAGE_TYPE_COMMAND",
  "ALF_MESSAGE_TYPE_FAQ",
  "ALF_MESSAGE_TYPE_FAILED",
  "ALF_MESSAGE_TYPE_RATE_LIMITED",
  "ALF_MESSAGE_TYPE_OPEN_USER_CHAT",
  "ALF_MESSAGE_TYPE_SYSTEM",
]);
export type MessagingAlfMessageType = ProtoBacked<
  z.infer<typeof MessagingAlfMessageTypeSchema>,
  ProtoMessagingAlfMessageType
>;

export const MessagingMeetModeSchema = z.enum([
  "MEET_MODE_UNSPECIFIED",
  "MEET_MODE_AUDIO",
  "MEET_MODE_VIDEO",
]);
export type MessagingMeetMode = ProtoBacked<
  z.infer<typeof MessagingMeetModeSchema>,
  ProtoMessagingMeetMode
>;

export const MessagingMessageMeetStateSchema = z.enum([
  "MESSAGE_MEET_STATE_UNSPECIFIED",
  "MESSAGE_MEET_STATE_LIVE",
  "MESSAGE_MEET_STATE_ENDED",
  "MESSAGE_MEET_STATE_TRANSCRIBING",
  "MESSAGE_MEET_STATE_TRANSCRIBED",
  "MESSAGE_MEET_STATE_TRANSCRIBE_FAILED",
]);
export type MessagingMessageMeetState = ProtoBacked<
  z.infer<typeof MessagingMessageMeetStateSchema>,
  ProtoMessagingMessageMeetState
>;

export const MessagingMessageStateSchema = z.enum([
  "MESSAGE_STATE_UNSPECIFIED",
  "MESSAGE_STATE_SENDING",
  "MESSAGE_STATE_SENT",
  "MESSAGE_STATE_FAILED",
  "MESSAGE_STATE_REMOVED",
]);
export type MessagingMessageState = ProtoBacked<
  z.infer<typeof MessagingMessageStateSchema>,
  ProtoMessagingMessageState
>;

export const MessagingMessageColorVariantSchema = z.enum([
  "MESSAGE_COLOR_VARIANT_UNSPECIFIED",
  "MESSAGE_COLOR_VARIANT_COBALT",
  "MESSAGE_COLOR_VARIANT_GREEN",
  "MESSAGE_COLOR_VARIANT_ORANGE",
  "MESSAGE_COLOR_VARIANT_RED",
  "MESSAGE_COLOR_VARIANT_BLACK",
  "MESSAGE_COLOR_VARIANT_PINK",
  "MESSAGE_COLOR_VARIANT_PURPLE",
]);
export type MessagingMessageColorVariant = ProtoBacked<
  z.infer<typeof MessagingMessageColorVariantSchema>,
  ProtoMessagingMessageColorVariant
>;

export const MessagingMessageOptionSchema = z.enum([
  "MESSAGE_OPTION_UNSPECIFIED",
  "MESSAGE_OPTION_ACT_AS_MANAGER",
  "MESSAGE_OPTION_DISPLAY_AS_CHANNEL",
  "MESSAGE_OPTION_DO_NOT_POST",
  "MESSAGE_OPTION_DO_NOT_SEARCH",
  "MESSAGE_OPTION_DO_NOT_SEND_APP",
  "MESSAGE_OPTION_DO_NOT_UPDATE_DESK",
  "MESSAGE_OPTION_IMMUTABLE",
  "MESSAGE_OPTION_PRIVATE",
  "MESSAGE_OPTION_SILENT_TO_MANAGER",
  "MESSAGE_OPTION_SILENT_TO_USER",
]);
export type MessagingMessageOption = ProtoBacked<
  z.infer<typeof MessagingMessageOptionSchema>,
  ProtoMessagingMessageOption
>;

export const MessagingMessageAlertLevelSchema = z.enum([
  "MESSAGE_ALERT_LEVEL_UNSPECIFIED",
  "MESSAGE_ALERT_LEVEL_ALERT",
  "MESSAGE_ALERT_LEVEL_UNREAD",
  "MESSAGE_ALERT_LEVEL_NONE",
]);
export type MessagingMessageAlertLevel = ProtoBacked<
  z.infer<typeof MessagingMessageAlertLevelSchema>,
  ProtoMessagingMessageAlertLevel
>;

export const MessagingWritingTypeSchema = z.enum([
  "WRITING_TYPE_UNSPECIFIED",
  "WRITING_TYPE_STANDARD",
  "WRITING_TYPE_CUSTOM",
  "WRITING_TYPE_EMAIL",
]);
export type MessagingWritingType = ProtoBacked<
  z.infer<typeof MessagingWritingTypeSchema>,
  ProtoMessagingWritingType
>;

export const MessagingUserChatStateSchema = z.enum([
  "USER_CHAT_STATE_UNSPECIFIED",
  "USER_CHAT_STATE_CLOSED",
  "USER_CHAT_STATE_OPENED",
  "USER_CHAT_STATE_SNOOZED",
  "USER_CHAT_STATE_INITIAL",
  "USER_CHAT_STATE_MISSED",
  "USER_CHAT_STATE_QUEUED",
]);
export type MessagingUserChatState = ProtoBacked<
  z.infer<typeof MessagingUserChatStateSchema>,
  ProtoMessagingUserChatState
>;

export const MessagingUserChatGoalStateSchema = z.enum([
  "USER_CHAT_GOAL_STATE_UNSPECIFIED",
  "USER_CHAT_GOAL_STATE_ACHIEVED",
  "USER_CHAT_GOAL_STATE_NOT_ACHIEVED",
  "USER_CHAT_GOAL_STATE_WAITING",
  "USER_CHAT_GOAL_STATE_NONE",
]);
export type MessagingUserChatGoalState = ProtoBacked<
  z.infer<typeof MessagingUserChatGoalStateSchema>,
  ProtoMessagingUserChatGoalState
>;

export const MessagingUserChatSubtextTypeSchema = z.enum([
  "USER_CHAT_SUBTEXT_TYPE_UNSPECIFIED",
  "USER_CHAT_SUBTEXT_TYPE_DESCRIPTION",
  "USER_CHAT_SUBTEXT_TYPE_INCOMING",
]);
export type MessagingUserChatSubtextType = ProtoBacked<
  z.infer<typeof MessagingUserChatSubtextTypeSchema>,
  ProtoMessagingUserChatSubtextType
>;

export const MessagingMissedReasonSchema = z.enum([
  "MISSED_REASON_UNSPECIFIED",
  "MISSED_REASON_NOT_IN_OPERATION",
  "MISSED_REASON_USER_LEFT",
  "MISSED_REASON_RING_TIME_OVER",
  "MISSED_REASON_RATE_LIMIT",
  "MISSED_REASON_NO_OPERATOR",
]);
export type MessagingMissedReason = ProtoBacked<
  z.infer<typeof MessagingMissedReasonSchema>,
  ProtoMessagingMissedReason
>;

export const MessagingUserTypeSchema = z.enum([
  "USER_TYPE_UNSPECIFIED",
  "USER_TYPE_MEMBER",
  "USER_TYPE_LEAD",
  "USER_TYPE_UNIFIED",
]);
export type MessagingUserType = ProtoBacked<
  z.infer<typeof MessagingUserTypeSchema>,
  ProtoMessagingUserType
>;

export const MessagingWritingTypeAvailabilityStateSchema = z.enum([
  "available",
  "unavailable",
  "unsupported",
]);
export type MessagingWritingTypeAvailabilityState = z.infer<
  typeof MessagingWritingTypeAvailabilityStateSchema
>;

export const MessagingPrebuiltEntityTypeSchema = z.enum(["oneTimeMsg", "campaign", "workflow"]);
export type MessagingPrebuiltEntityType = z.infer<typeof MessagingPrebuiltEntityTypeSchema>;

export const MessagingAlfSchema = z
  .object({
    type: MessagingAlfMessageTypeSchema.optional(),
    handlingId: z.string().optional(),
    references: z.array(JsonObjectSchema).optional(),
    mentionAlfAnswered: z.boolean().optional(),
  })
  .passthrough();
export type MessagingAlf = ProtoBacked<z.infer<typeof MessagingAlfSchema>, ProtoMessagingAlf>;

export const MessagingMeetSchema = z
  .object({
    id: z.string().optional(),
    call: JsonObjectSchema.optional(),
    mode: MessagingMeetModeSchema.optional(),
    state: MessagingMessageMeetStateSchema.optional(),
    country: z.string().optional(),
    recording: JsonObjectSchema.optional(),
    managerIds: z.array(z.string()).optional(),
    roomStartedAt: z.string().optional(),
    amassedPersons: z.array(z.string()).optional(),
  })
  .passthrough();
export type MessagingMeet = ProtoBacked<z.infer<typeof MessagingMeetSchema>, ProtoMessagingMeet>;

export const MessagingMessageFileSchema = z
  .object({
    url: z.string(),
    mime: z.string(),
    fileName: z.string(),
  })
  .passthrough();
export type MessagingMessageFile = ProtoBacked<
  z.infer<typeof MessagingMessageFileSchema>,
  ProtoMessagingMessageFile
>;

export const MessagingPartialMessageFileSchema = MessagingMessageFileSchema.partial();
export type MessagingPartialMessageFile = ProtoBacked<
  z.infer<typeof MessagingPartialMessageFileSchema>,
  Partial<ProtoMessagingMessageFile>
>;

export const MessagingMessageThreadSchema = z
  .object({
    id: z.string().optional(),
    managerIds: z.array(z.string()).optional(),
    replyCount: z.number().int().optional(),
    repliedManagerIds: z.array(z.string()).optional(),
  })
  .passthrough();
export type MessagingMessageThread = ProtoBacked<
  z.infer<typeof MessagingMessageThreadSchema>,
  ProtoMessagingMessageThread
>;

export const MessagingMessageButtonSchema = z
  .object({
    title: z.string(),
    action: JsonObjectSchema,
    colorVariant: MessagingMessageColorVariantSchema.optional(),
  })
  .passthrough();
export type MessagingMessageButton = ProtoBacked<
  z.infer<typeof MessagingMessageButtonSchema>,
  ProtoMessagingMessageButton
>;

export const MessagingCustomPayloadSchema = z
  .object({
    data: JsonObjectSchema.optional(),
    paramMapper: JsonObjectSchema.optional(),
  })
  .passthrough();
export type MessagingCustomPayload = ProtoBacked<
  z.infer<typeof MessagingCustomPayloadSchema>,
  ProtoMessagingCustomPayload
>;

const MessagingMessageShape = {
  id: z.string(),
  alf: MessagingAlfSchema.optional(),
  log: JsonObjectSchema.optional(),
  form: JsonObjectSchema.optional(),
  meet: MessagingMeetSchema.optional(),
  files: z.array(MessagingMessageFileSchema).optional(),
  state: MessagingMessageStateSchema.optional(),
  blocks: z.array(JsonObjectSchema).optional(),
  chatId: z.string(),
  thread: MessagingMessageThreadSchema.optional(),
  buttons: z.array(MessagingMessageButtonSchema).optional(),
  options: z.array(MessagingMessageOptionSchema).optional(),
  version: MessagingNonNegativeInt64StringSchema.optional(),
  webPage: JsonObjectSchema.optional(),
  chatType: z.string(),
  language: z.string(),
  personId: z.string(),
  channelId: z.string(),
  createdAt: z.string(),
  marketing: JsonObjectSchema.optional(),
  plainText: z.string().optional(),
  reactions: z.array(JsonObjectSchema).optional(),
  requestId: z.string().optional(),
  updatedAt: z.string().optional(),
  alertLevel: MessagingMessageAlertLevelSchema.optional(),
  personType: z.string(),
  supportBot: JsonObjectSchema.optional(),
  writingType: MessagingWritingTypeSchema.optional(),
  customPayload: MessagingCustomPayloadSchema.optional(),
  inboundEmailId: z.string().optional(),
};

export const MessagingMessageSchema = z.object(MessagingMessageShape).passthrough();
export type MessagingMessage = ProtoBacked<
  z.infer<typeof MessagingMessageSchema>,
  ProtoMessagingMessage
>;

export const MessagingPartialMessageSchema = MessagingMessageSchema.partial();
export type MessagingPartialMessage = ProtoBacked<
  z.infer<typeof MessagingPartialMessageSchema>,
  Partial<ProtoMessagingMessage>
>;

const MessagingPrebuiltMessageShape = {
  id: z.string(),
  files: z.array(MessagingPartialMessageFileSchema).optional(),
  blocks: z.array(JsonObjectSchema).optional(),
  chatId: z.string(),
  buttons: z.array(JsonObjectSchema).optional(),
  version: MessagingNonNegativeInt64StringSchema.optional(),
  chatType: z.string(),
  language: z.string(),
  personId: z.string(),
  channelId: z.string(),
  createdAt: z.string(),
  plainText: z.string().optional(),
  requestId: z.string().optional(),
  updatedAt: z.string().optional(),
  personType: z.string(),
  writingType: MessagingWritingTypeSchema.optional(),
  customPayload: MessagingCustomPayloadSchema.optional(),
};

export const MessagingPrebuiltMessageSchema = z.object(MessagingPrebuiltMessageShape).passthrough();
export type MessagingPrebuiltMessage = ProtoBacked<
  z.infer<typeof MessagingPrebuiltMessageSchema>,
  ProtoMessagingPrebuiltMessage
>;

export const MessagingPrebuiltPartialMessageSchema = MessagingPrebuiltMessageSchema.partial();
export type MessagingPrebuiltPartialMessage = ProtoBacked<
  z.infer<typeof MessagingPrebuiltPartialMessageSchema>,
  Partial<ProtoMessagingPrebuiltMessage>
>;

export const MessagingUserChatSchema = z
  .object({
    id: z.string(),
    name: z.string().optional(),
    sync: z.boolean().optional(),
    tags: z.array(z.string()).optional(),
    state: MessagingUserChatStateSchema.optional(),
    title: z.string().optional(),
    xerId: z.string().optional(),
    source: JsonObjectSchema.optional(),
    teamId: z.string().optional(),
    userId: z.string(),
    askedAt: z.string().optional(),
    managed: z.boolean().optional(),
    oneStop: z.boolean().optional(),
    profile: JsonObjectSchema.optional(),
    version: MessagingNonNegativeInt64StringSchema.optional(),
    closedAt: z.string().optional(),
    handling: JsonObjectSchema.optional(),
    mediumId: z.string().optional(),
    openedAt: z.string().optional(),
    priority: z.string().optional(),
    channelId: z.string(),
    createdAt: z.string().optional(),
    expiresAt: z.string().optional(),
    goalState: MessagingUserChatGoalStateSchema.optional(),
    mediumKey: z.string().optional(),
    snoozedAt: z.string().optional(),
    updatedAt: z.string().optional(),
    assigneeId: z.string().optional(),
    liveMeetId: z.string().optional(),
    managerIds: z.array(z.string()).optional(),
    mediumType: z.string(),
    replyCount: z.number().int().optional(),
    description: z.string().optional(),
    subtextType: MessagingUserChatSubtextTypeSchema.optional(),
    waitingTime: MessagingNonNegativeInt64StringSchema.optional(),
    avgReplyTime: MessagingNonNegativeInt64StringSchema.optional(),
    firstAskedAt: z.string().optional(),
    missedReason: MessagingMissedReasonSchema.optional(),
    deskMessageId: z.string().optional(),
    deskUpdatedAt: z.string().optional(),
    firstOpenedAt: z.string().optional(),
    goalCheckedAt: z.string().optional(),
    goalEventName: z.string().optional(),
    mediumProfile: JsonObjectSchema.optional(),
    frontMessageId: z.string().optional(),
    frontUpdatedAt: z.string().optional(),
    goalEventQuery: JsonObjectSchema.optional(),
    mediumTopicKey: z.string(),
    resolutionTime: MessagingNonNegativeInt64StringSchema.optional(),
    totalReplyTime: MessagingNonNegativeInt64StringSchema.optional(),
    contactMediumType: z.string().optional(),
    mediumTopicLabels: z.array(z.string()).optional(),
    userLastMessageId: z.string().optional(),
    operationReplyCount: z.number().int().optional(),
    operationWaitingTime: MessagingNonNegativeInt64StringSchema.optional(),
    operationAvgReplyTime: MessagingNonNegativeInt64StringSchema.optional(),
    firstRepliedAtAfterOpen: z.string().optional(),
    operationResolutionTime: MessagingNonNegativeInt64StringSchema.optional(),
    operationTotalReplyTime: MessagingNonNegativeInt64StringSchema.optional(),
    firstAssigneeIdAfterOpen: z.string().optional(),
  })
  .passthrough();
export type MessagingUserChat = ProtoBacked<
  z.infer<typeof MessagingUserChatSchema>,
  ProtoMessagingUserChat
>;

export const MessagingUserSchema = z
  .object({
    id: z.string(),
    web: JsonObjectSchema.optional(),
    city: z.string().optional(),
    name: z.string().optional(),
    tags: z.array(z.string()).optional(),
    type: MessagingUserTypeSchema.optional(),
    alert: z.number().int().optional(),
    mobile: JsonObjectSchema.optional(),
    unread: z.number().int().optional(),
    veilId: z.string().optional(),
    blocked: z.boolean().optional(),
    country: z.string().optional(),
    hasChat: z.boolean().optional(),
    profile: JsonObjectSchema.optional(),
    version: MessagingNonNegativeInt64StringSchema.optional(),
    language: z.string().optional(),
    latitude: z.number().optional(),
    memberId: z.string().optional(),
    province: z.string().optional(),
    timeZone: z.string().optional(),
    channelId: z.string(),
    createdAt: z.string(),
    longitude: z.number().optional(),
    unifiedId: z.string().optional(),
    updatedAt: z.string().optional(),
    lastSeenAt: z.string().optional(),
    mainChatId: z.string().optional(),
    popUpChatId: z.string().optional(),
    hasPushToken: z.boolean().optional(),
    sessionsCount: z.number().int().optional(),
    emailQualified: z.boolean().optional(),
    unsubscribeEmail: z.boolean().optional(),
    unsubscribeTexting: z.boolean().optional(),
    mobileNumberQualified: z.boolean().optional(),
  })
  .passthrough();
export type MessagingUser = ProtoBacked<z.infer<typeof MessagingUserSchema>, ProtoMessagingUser>;

export const MessagingWamResultSchema = z
  .object({
    type: z.literal("wam"),
    attributes: z
      .object({
        appId: z.string(),
        name: z.string(),
        wamArgs: JsonObjectSchema,
      })
      .passthrough(),
  })
  .passthrough();
export type MessagingWamResult = ProtoBacked<
  z.infer<typeof MessagingWamResultSchema>,
  ProtoMessagingWamResult
>;

export const MessagingUnavailableReasonSchema = z
  .object({
    msg: z.string().optional(),
    link: z.string().optional(),
    linkText: z.string().optional(),
  })
  .passthrough();
export type MessagingUnavailableReason = ProtoBacked<
  z.infer<typeof MessagingUnavailableReasonSchema>,
  ProtoMessagingUnavailableReason
>;

export const MessagingWritingTypeStateSchema = z
  .object({
    state: MessagingWritingTypeAvailabilityStateSchema,
    unavailableReasons: z.array(MessagingUnavailableReasonSchema).optional(),
  })
  .passthrough();
export type MessagingWritingTypeState = ProtoBacked<
  z.infer<typeof MessagingWritingTypeStateSchema>,
  ProtoMessagingWritingTypeState
>;

export const MessagingWritingTypeMapSchema = z
  .object({
    custom: MessagingWritingTypeStateSchema.optional(),
    standard: MessagingWritingTypeStateSchema.optional(),
  })
  .passthrough();
export type MessagingWritingTypeMap = ProtoBacked<
  z.infer<typeof MessagingWritingTypeMapSchema>,
  ProtoMessagingWritingTypeMap
>;

export const MessagingMediumProfileSchema = z
  .object({
    mediumName: z.string().optional(),
    mediumSenderId: z.string().optional(),
    mediumSenderName: z.string().optional(),
  })
  .passthrough();
export type MessagingMediumProfile = ProtoBacked<
  z.infer<typeof MessagingMediumProfileSchema>,
  ProtoMessagingMediumProfile
>;

export const OnMediumMessageCreatedInputSchema = z
  .object({
    userChat: MessagingUserChatSchema,
    message: MessagingMessageSchema,
  })
  .passthrough();
export type OnMediumMessageCreatedInput = ProtoBacked<
  z.infer<typeof OnMediumMessageCreatedInputSchema>,
  ProtoOnMediumMessageCreatedInput
>;

export const OnMediumMessageCreatedOutputSchema = z
  .object({
    sendResult: z
      .object({
        sendState: z.string(),
        message: z.string().optional(),
      })
      .passthrough(),
  })
  .passthrough();
export type OnMediumMessageCreatedOutput = ProtoBacked<
  z.infer<typeof OnMediumMessageCreatedOutputSchema>,
  ProtoOnMediumMessageCreatedOutput
>;

export const InboxOnMediumUserChatClosedInputSchema = z
  .object({
    userChat: MessagingUserChatSchema,
  })
  .passthrough();
export type InboxOnMediumUserChatClosedInput = ProtoBacked<
  z.infer<typeof InboxOnMediumUserChatClosedInputSchema>,
  ProtoInboxOnMediumUserChatClosedInput
>;

export const InboxOnMediumUserChatClosedOutputSchema = z.object({}).passthrough();
export type InboxOnMediumUserChatClosedOutput = ProtoBacked<
  z.infer<typeof InboxOnMediumUserChatClosedOutputSchema>,
  ProtoInboxOnMediumUserChatClosedOutput
>;

export const InboxGetWritingTypesInputSchema = z
  .object({
    userChat: MessagingUserChatSchema,
  })
  .passthrough();
export type InboxGetWritingTypesInput = ProtoBacked<
  z.infer<typeof InboxGetWritingTypesInputSchema>,
  ProtoInboxGetWritingTypesInput
>;

// The archived JSON says this output key is `writingTypes`, but AppStore runtime
// expects `writingTypeMap`. The SDK follows the runtime contract.
export const InboxGetWritingTypesOutputSchema = z
  .object({
    writingTypeMap: MessagingWritingTypeMapSchema,
  })
  .passthrough();
export type InboxGetWritingTypesOutput = ProtoBacked<
  z.infer<typeof InboxGetWritingTypesOutputSchema>,
  ProtoInboxGetWritingTypesOutput
>;

export const InboxGetCustomEditorWamInputSchema = z
  .object({
    user: MessagingUserSchema,
    userChat: MessagingUserChatSchema,
    entityType: z.string().optional(),
    mediumTopicKey: z.string().optional(),
    mediumTopicLabels: z.array(z.string()).optional(),
    message: MessagingPartialMessageSchema.optional(),
  })
  .passthrough();
export type InboxGetCustomEditorWamInput = ProtoBacked<
  z.infer<typeof InboxGetCustomEditorWamInputSchema>,
  ProtoInboxGetCustomEditorWamInput
>;

export const InboxGetCustomEditorWamOutputSchema = MessagingWamResultSchema;
export type InboxGetCustomEditorWamOutput = ProtoBacked<
  z.infer<typeof InboxGetCustomEditorWamOutputSchema>,
  ProtoMessagingWamResult
>;

export const InboxGetMediumTopicSelectorWamInputSchema = z
  .object({
    user: MessagingUserSchema,
  })
  .passthrough();
export type InboxGetMediumTopicSelectorWamInput = ProtoBacked<
  z.infer<typeof InboxGetMediumTopicSelectorWamInputSchema>,
  ProtoInboxGetMediumTopicSelectorWamInput
>;

export const InboxGetMediumTopicSelectorWamOutputSchema = MessagingWamResultSchema;
export type InboxGetMediumTopicSelectorWamOutput = ProtoBacked<
  z.infer<typeof InboxGetMediumTopicSelectorWamOutputSchema>,
  ProtoMessagingWamResult
>;

export const InboxGetMediumMessageErrorReasonInputSchema = z
  .object({
    userChat: MessagingUserChatSchema,
    message: MessagingMessageSchema.extend({ errorCode: z.string() }),
  })
  .passthrough();
export type InboxGetMediumMessageErrorReasonInput = ProtoBacked<
  z.infer<typeof InboxGetMediumMessageErrorReasonInputSchema>,
  ProtoInboxGetMediumMessageErrorReasonInput
>;

export const InboxGetMediumMessageErrorReasonOutputSchema = z
  .object({
    errorMessage: z.string(),
  })
  .passthrough();
export type InboxGetMediumMessageErrorReasonOutput = ProtoBacked<
  z.infer<typeof InboxGetMediumMessageErrorReasonOutputSchema>,
  ProtoInboxGetMediumMessageErrorReasonOutput
>;

export const PrebuiltGetWritingTypesInputSchema = z.object({}).passthrough();
export type PrebuiltGetWritingTypesInput = ProtoBacked<
  z.infer<typeof PrebuiltGetWritingTypesInputSchema>,
  ProtoPrebuiltGetWritingTypesInput
>;

export const PrebuiltGetWritingTypesOutputSchema = z
  .object({
    writingTypeMap: MessagingWritingTypeMapSchema,
  })
  .passthrough();
export type PrebuiltGetWritingTypesOutput = ProtoBacked<
  z.infer<typeof PrebuiltGetWritingTypesOutputSchema>,
  ProtoPrebuiltGetWritingTypesOutput
>;

export const PrebuiltValidateEntityInputSchema = z
  .object({
    message: MessagingPrebuiltMessageSchema,
    entityType: MessagingPrebuiltEntityTypeSchema,
    entityId: z.string(),
    mediumTopicBuildKey: z.string(),
    mediumTopicBuildLabels: z.array(z.string()).optional(),
  })
  .passthrough();
export type PrebuiltValidateEntityInput = ProtoBacked<
  z.infer<typeof PrebuiltValidateEntityInputSchema>,
  ProtoPrebuiltValidateEntityInput
>;

export const PrebuiltValidateEntityOutputSchema = z
  .object({
    entityType: z.string(),
    entityId: z.string(),
    reasons: z.array(MessagingUnavailableReasonSchema),
  })
  .passthrough();
export type PrebuiltValidateEntityOutput = ProtoBacked<
  z.infer<typeof PrebuiltValidateEntityOutputSchema>,
  ProtoPrebuiltValidateEntityOutput
>;

export const PrebuiltGetCustomEditorWamInputSchema = z
  .object({
    entityType: MessagingPrebuiltEntityTypeSchema,
    entityId: z.string(),
    mediumTopicBuildKey: z.string(),
    mediumTopicBuildLabels: z.array(z.string()).optional(),
    message: MessagingPrebuiltPartialMessageSchema.optional(),
    triggerEventName: z.string().optional(),
    triggerEventNameI18nMap: JsonObjectSchema.optional(),
  })
  .passthrough();
export type PrebuiltGetCustomEditorWamInput = ProtoBacked<
  z.infer<typeof PrebuiltGetCustomEditorWamInputSchema>,
  ProtoPrebuiltGetCustomEditorWamInput
>;

export const PrebuiltGetCustomEditorWamOutputSchema = MessagingWamResultSchema;
export type PrebuiltGetCustomEditorWamOutput = ProtoBacked<
  z.infer<typeof PrebuiltGetCustomEditorWamOutputSchema>,
  ProtoMessagingWamResult
>;

export const PrebuiltGetMediumTopicBuilderSelectorWamInputSchema = z
  .object({
    entityType: MessagingPrebuiltEntityTypeSchema,
  })
  .passthrough();
export type PrebuiltGetMediumTopicBuilderSelectorWamInput = ProtoBacked<
  z.infer<typeof PrebuiltGetMediumTopicBuilderSelectorWamInputSchema>,
  ProtoPrebuiltGetMediumTopicBuilderSelectorWamInput
>;

export const PrebuiltGetMediumTopicBuilderSelectorWamOutputSchema = MessagingWamResultSchema;
export type PrebuiltGetMediumTopicBuilderSelectorWamOutput = ProtoBacked<
  z.infer<typeof PrebuiltGetMediumTopicBuilderSelectorWamOutputSchema>,
  ProtoMessagingWamResult
>;

export const PrebuiltBuildMediumTopicsInputSchema = z
  .object({
    user: MessagingUserSchema,
    entityType: MessagingPrebuiltEntityTypeSchema,
    mediumTopicBuilderKey: z.string(),
  })
  .passthrough();
export type PrebuiltBuildMediumTopicsInput = ProtoBacked<
  z.infer<typeof PrebuiltBuildMediumTopicsInputSchema>,
  ProtoPrebuiltBuildMediumTopicsInput
>;

export const PrebuiltBuildMediumTopicsOutputSchema = z
  .object({
    mediumTopicKey: z.string(),
    mediumTopicLabels: z.array(z.string()),
    mediumProfile: MessagingMediumProfileSchema,
  })
  .passthrough();
export type PrebuiltBuildMediumTopicsOutput = ProtoBacked<
  z.infer<typeof PrebuiltBuildMediumTopicsOutputSchema>,
  ProtoPrebuiltBuildMediumTopicsOutput
>;

export const PrebuiltGetDefaultOptionsInputSchema = z.object({}).passthrough();
export type PrebuiltGetDefaultOptionsInput = ProtoBacked<
  z.infer<typeof PrebuiltGetDefaultOptionsInputSchema>,
  ProtoPrebuiltGetDefaultOptionsInput
>;

export const PrebuiltGetDefaultOptionsOutputSchema = z
  .object({
    defaultOptions: z
      .object({
        "campaign.userQuery": JsonObjectSchema.optional(),
        "oneTimeMsg.userQuery": JsonObjectSchema.optional(),
        "campaign.selectableAdvertising": z.boolean().optional(),
        "oneTimeMsg.selectableAdvertising": z.boolean().optional(),
      })
      .passthrough(),
  })
  .passthrough();
export type PrebuiltGetDefaultOptionsOutput = ProtoBacked<
  z.infer<typeof PrebuiltGetDefaultOptionsOutputSchema>,
  ProtoPrebuiltGetDefaultOptionsOutput
>;

export type MessagingHandler<TInput, TOutput> = (
  ctx: Context,
  input: TInput
) => TOutput | Promise<TOutput>;

export interface MessagingInboxProvider {
  onMediumMessageCreated: MessagingHandler<
    OnMediumMessageCreatedInput,
    OnMediumMessageCreatedOutput
  >;
  onMediumUserChatClosed?: MessagingHandler<
    InboxOnMediumUserChatClosedInput,
    InboxOnMediumUserChatClosedOutput
  >;
  getWritingTypes?: MessagingHandler<InboxGetWritingTypesInput, InboxGetWritingTypesOutput>;
  getCustomEditorWam?: MessagingHandler<
    InboxGetCustomEditorWamInput,
    InboxGetCustomEditorWamOutput
  >;
  getMediumTopicSelectorWam?: MessagingHandler<
    InboxGetMediumTopicSelectorWamInput,
    InboxGetMediumTopicSelectorWamOutput
  >;
  getMediumMessageErrorReason?: MessagingHandler<
    InboxGetMediumMessageErrorReasonInput,
    InboxGetMediumMessageErrorReasonOutput
  >;
}

export interface MessagingPrebuiltProvider {
  getWritingTypes?: MessagingHandler<PrebuiltGetWritingTypesInput, PrebuiltGetWritingTypesOutput>;
  validateEntity?: MessagingHandler<PrebuiltValidateEntityInput, PrebuiltValidateEntityOutput>;
  getCustomEditorWam?: MessagingHandler<
    PrebuiltGetCustomEditorWamInput,
    PrebuiltGetCustomEditorWamOutput
  >;
  getMediumTopicBuilderSelectorWam?: MessagingHandler<
    PrebuiltGetMediumTopicBuilderSelectorWamInput,
    PrebuiltGetMediumTopicBuilderSelectorWamOutput
  >;
  buildMediumTopics?: MessagingHandler<
    PrebuiltBuildMediumTopicsInput,
    PrebuiltBuildMediumTopicsOutput
  >;
  getDefaultOptions?: MessagingHandler<
    PrebuiltGetDefaultOptionsInput,
    PrebuiltGetDefaultOptionsOutput
  >;
}

export type MessagingExtensionProvider =
  | { inbox: MessagingInboxProvider; prebuilt?: MessagingPrebuiltProvider }
  | { inbox?: MessagingInboxProvider; prebuilt: MessagingPrebuiltProvider };

/**
 * Build a schema-validated messaging v1 Extension definition.
 *
 * This helper registers Function metadata only. Product-specific messaging setup
 * outside the Extension Function contract remains an AppStore configuration step.
 */
export function createMessagingExtension(
  provider: MessagingExtensionProvider
): ExtensionDefinition {
  const inbox = provider.inbox;
  const prebuilt = provider.prebuilt;

  if (!inbox && !prebuilt) {
    throw new Error("A messaging extension requires an inbox or prebuilt provider");
  }

  return {
    name: "messaging",
    systemVersion: "v1",
    groups: {
      ...(inbox
        ? {
            inbox: {
              onMediumMessageCreated: messagingFunction(
                OnMediumMessageCreatedInputSchema,
                OnMediumMessageCreatedOutputSchema,
                inbox.onMediumMessageCreated
              ),
              ...(inbox.onMediumUserChatClosed
                ? {
                    onMediumUserChatClosed: messagingFunction(
                      InboxOnMediumUserChatClosedInputSchema,
                      InboxOnMediumUserChatClosedOutputSchema,
                      inbox.onMediumUserChatClosed
                    ),
                  }
                : {}),
              ...(inbox.getWritingTypes
                ? {
                    getWritingTypes: messagingFunction(
                      InboxGetWritingTypesInputSchema,
                      InboxGetWritingTypesOutputSchema,
                      inbox.getWritingTypes
                    ),
                  }
                : {}),
              ...(inbox.getCustomEditorWam
                ? {
                    getCustomEditorWam: messagingFunction(
                      InboxGetCustomEditorWamInputSchema,
                      InboxGetCustomEditorWamOutputSchema,
                      inbox.getCustomEditorWam
                    ),
                  }
                : {}),
              ...(inbox.getMediumTopicSelectorWam
                ? {
                    getMediumTopicSelectorWam: messagingFunction(
                      InboxGetMediumTopicSelectorWamInputSchema,
                      InboxGetMediumTopicSelectorWamOutputSchema,
                      inbox.getMediumTopicSelectorWam
                    ),
                  }
                : {}),
              ...(inbox.getMediumMessageErrorReason
                ? {
                    getMediumMessageErrorReason: messagingFunction(
                      InboxGetMediumMessageErrorReasonInputSchema,
                      InboxGetMediumMessageErrorReasonOutputSchema,
                      inbox.getMediumMessageErrorReason
                    ),
                  }
                : {}),
            },
          }
        : {}),
      ...(prebuilt
        ? {
            prebuilt: {
              ...(prebuilt.getWritingTypes
                ? {
                    getWritingTypes: messagingFunction(
                      PrebuiltGetWritingTypesInputSchema,
                      PrebuiltGetWritingTypesOutputSchema,
                      prebuilt.getWritingTypes
                    ),
                  }
                : {}),
              ...(prebuilt.validateEntity
                ? {
                    validateEntity: messagingFunction(
                      PrebuiltValidateEntityInputSchema,
                      PrebuiltValidateEntityOutputSchema,
                      prebuilt.validateEntity
                    ),
                  }
                : {}),
              ...(prebuilt.getCustomEditorWam
                ? {
                    getCustomEditorWam: messagingFunction(
                      PrebuiltGetCustomEditorWamInputSchema,
                      PrebuiltGetCustomEditorWamOutputSchema,
                      prebuilt.getCustomEditorWam
                    ),
                  }
                : {}),
              ...(prebuilt.getMediumTopicBuilderSelectorWam
                ? {
                    getMediumTopicBuilderSelectorWam: messagingFunction(
                      PrebuiltGetMediumTopicBuilderSelectorWamInputSchema,
                      PrebuiltGetMediumTopicBuilderSelectorWamOutputSchema,
                      prebuilt.getMediumTopicBuilderSelectorWam
                    ),
                  }
                : {}),
              ...(prebuilt.buildMediumTopics
                ? {
                    buildMediumTopics: messagingFunction(
                      PrebuiltBuildMediumTopicsInputSchema,
                      PrebuiltBuildMediumTopicsOutputSchema,
                      prebuilt.buildMediumTopics
                    ),
                  }
                : {}),
              ...(prebuilt.getDefaultOptions
                ? {
                    getDefaultOptions: messagingFunction(
                      PrebuiltGetDefaultOptionsInputSchema,
                      PrebuiltGetDefaultOptionsOutputSchema,
                      prebuilt.getDefaultOptions
                    ),
                  }
                : {}),
            },
          }
        : {}),
    },
  };
}

function messagingFunction<TInput, TOutput>(
  input: z.ZodType<TInput>,
  output: z.ZodType<TOutput>,
  handler: MessagingHandler<TInput, TOutput>
): FunctionDefinition<z.ZodType<TInput>, z.ZodType<TOutput>> {
  return {
    input,
    output,
    handler: async (ctx, value) => output.parse(await handler(ctx, input.parse(value))),
  };
}
