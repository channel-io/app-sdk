/* eslint-disable @typescript-eslint/no-deprecated -- Deprecated API key schemas are still part of the public compatibility contract. */
import type { z } from "zod";
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
  AlfTaskGetTasksOutput as ProtoAlfTaskGetTasksOutput,
  AlfTaskMemoryDefinition as ProtoAlfTaskMemoryDefinition,
  AlfTaskPredefinedTask as ProtoAlfTaskPredefinedTask,
  AlfTaskWorkflowNode as ProtoAlfTaskWorkflowNode,
  ApiKeyField as ProtoApiKeyField,
  ApiKeyGetAuthConfigOutput as ProtoApiKeyGetAuthConfigOutput,
  ApiKeyValidateCredentialsOutput as ProtoApiKeyValidateCredentialsOutput,
  Calendar as ProtoCalendar,
  CalendarAttendee as ProtoCalendarAttendee,
  CalendarBooking as ProtoCalendarBooking,
  CalendarEventType as ProtoCalendarEventType,
  CalendarTimeSlot as ProtoCalendarTimeSlot,
  CommandChoice as ProtoCommandChoice,
  CommandConfig as ProtoCommandConfig,
  CommandGetCommandsOutput as ProtoCommandGetCommandsOutput,
  CommandNameDescI18n as ProtoCommandNameDescI18n,
  CommandNameI18n as ProtoCommandNameI18n,
  CommandParamDefI18n as ProtoCommandParamDefI18n,
  CommandParamDefinition as ProtoCommandParamDefinition,
  CommandResult as ProtoCommandResult,
  ConfigBlock as ProtoConfigBlock,
  ConfigChoice as ProtoConfigChoice,
  ConfigChoicesSource as ProtoConfigChoicesSource,
  ConfigCondition as ProtoConfigCondition,
  ConfigDraftResolutionOutput as ProtoConfigDraftResolutionOutput,
  ConfigDraftResolutionParams as ProtoConfigDraftResolutionParams,
  ConfigGetConfigSchemaOutput as ProtoConfigGetConfigSchemaOutput,
  ConfigField as ProtoConfigField,
  ConfigHooks as ProtoConfigHooks,
  ConfigInlineLink as ProtoConfigInlineLink,
  ConfigOAuth as ProtoConfigOAuth,
  ConfigOAuthAdditionalParam as ProtoConfigOAuthAdditionalParam,
  ConfigResolvedValueTarget as ProtoConfigResolvedValueTarget,
  ConfigValidateStoredConfigOutput as ProtoConfigValidateStoredConfigOutput,
  ConfigValidationError as ProtoConfigValidationError,
  ConfigValidationNotice as ProtoConfigValidationNotice,
  CustomTabActionResult as ProtoCustomTabActionResult,
  CustomTabConfig as ProtoCustomTabConfig,
  CustomTabGetCustomTabsOutput as ProtoCustomTabGetCustomTabsOutput,
  CustomTabNameI18n as ProtoCustomTabNameI18n,
  DataSourceAuthorizeQueryInput as ProtoDataSourceAuthorizeQueryInput,
  DataSourceAuthorizeQueryOutput as ProtoDataSourceAuthorizeQueryOutput,
  DataSourceCatalog as ProtoDataSourceCatalog,
  DataSourceColumn as ProtoDataSourceColumn,
  DataSourceDescribeTableInput as ProtoDataSourceDescribeTableInput,
  DataSourceDescribeTableOutput as ProtoDataSourceDescribeTableOutput,
  DataSourceListCatalogsInput as ProtoDataSourceListCatalogsInput,
  DataSourceListCatalogsOutput as ProtoDataSourceListCatalogsOutput,
  DataSourceListTablesInput as ProtoDataSourceListTablesInput,
  DataSourceListTablesOutput as ProtoDataSourceListTablesOutput,
  DataSourceQueryFilter as ProtoDataSourceQueryFilter,
  DataSourceQueryTableAccess as ProtoDataSourceQueryTableAccess,
  DataSourceTable as ProtoDataSourceTable,
  DataSourceTableDefinition as ProtoDataSourceTableDefinition,
  DataSourceTableListing as ProtoDataSourceTableListing,
  HookConfig as ProtoHookConfig,
  HookGetHooksOutput as ProtoHookGetHooksOutput,
  HookWebhookConfig as ProtoHookWebhookConfig,
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
  MailRelayCommonHeaders as ProtoMailRelayCommonHeaders,
  MailRelayHeader as ProtoMailRelayHeader,
  MailRelayInboundInput as ProtoMailRelayInboundInput,
  MailRelayInboundOutput as ProtoMailRelayInboundOutput,
  MailRelayMail as ProtoMailRelayMail,
  MailRelayReceipt as ProtoMailRelayReceipt,
  AppNotebook as ProtoAppNotebook,
  NotebookCell as ProtoNotebookCell,
  NotebookGetNotebooksOutput as ProtoNotebookGetNotebooksOutput,
  NotebookLayoutColumn as ProtoNotebookLayoutColumn,
  NotebookLayoutRow as ProtoNotebookLayoutRow,
  NotebookPayload as ProtoNotebookPayload,
  NotebookTab as ProtoNotebookTab,
  OAuthConfig as ProtoOAuthConfig,
  OAuthCredentialValidationInput as ProtoOAuthCredentialValidationInput,
  OAuthCredentialValidationResult as ProtoOAuthCredentialValidationResult,
  OAuthProvider as ProtoOAuthProvider,
  Order as ProtoOrder,
  OrderAddress as ProtoOrderAddress,
  OrderAppCapabilities as ProtoOrderAppCapabilities,
  OrderBankAccount as ProtoOrderBankAccount,
  OrderClaim as ProtoOrderClaim,
  OrderClaimability as ProtoOrderClaimability,
  OrderClaimReason as ProtoOrderClaimReason,
  OrderDefectInfo as ProtoOrderDefectInfo,
  OrderFulfillment as ProtoOrderFulfillment,
  OrderFieldConfig as ProtoOrderFieldConfig,
  OrderItem as ProtoOrderItem,
  OrderOperationOptions as ProtoOrderOperationOptions,
  OrderPayment as ProtoOrderPayment,
  PollingGetPollersOutput as ProtoPollingGetPollersOutput,
  PollingGetTargetChannelsInput as ProtoPollingGetTargetChannelsInput,
  PollingGetTargetChannelsOutput as ProtoPollingGetTargetChannelsOutput,
  PollingGetTargetManagersInput as ProtoPollingGetTargetManagersInput,
  PollingGetTargetManagersOutput as ProtoPollingGetTargetManagersOutput,
  PollingManagerTarget as ProtoPollingManagerTarget,
  PollingPoller as ProtoPollingPoller,
  StoreFaq as ProtoStoreFaq,
  StoreGetProfileInput as ProtoStoreGetProfileInput,
  StoreGetProfileOutput as ProtoStoreGetProfileOutput,
  StoreProfileImage as ProtoStoreProfileImage,
  StoreProfileIntro as ProtoStoreProfileIntro,
  StoreProfileLocalizedContent as ProtoStoreProfileLocalizedContent,
  WidgetActionResult as ProtoWidgetActionResult,
  WidgetConfig as ProtoWidgetConfig,
  WidgetGetWidgetsOutput as ProtoWidgetGetWidgetsOutput,
  WidgetNameDescI18n as ProtoWidgetNameDescI18n,
  WmsChangeShippingAddressRequest as ProtoWmsChangeShippingAddressRequest,
  WmsDelivery as ProtoWmsDelivery,
  WmsGetOrderRequest as ProtoWmsGetOrderRequest,
  WmsGetOrderResult as ProtoWmsGetOrderResult,
  WmsGetOrdersRequest as ProtoWmsGetOrdersRequest,
  WmsGetOrdersResult as ProtoWmsGetOrdersResult,
  WmsGetShopIDRequest as ProtoWmsGetShopIDRequest,
  WmsGetShopIDResult as ProtoWmsGetShopIDResult,
  WmsGetSupportedCommercesRequest as ProtoWmsGetSupportedCommercesRequest,
  WmsGetSupportedCommercesResult as ProtoWmsGetSupportedCommercesResult,
  WmsOrder as ProtoWmsOrder,
  WmsOrderItem as ProtoWmsOrderItem,
  WmsOrderStateRequest as ProtoWmsOrderStateRequest,
  WmsRestoreOrderRequest as ProtoWmsRestoreOrderRequest,
  WmsShippingInfo as ProtoWmsShippingInfo,
  WmsSuccessResult as ProtoWmsSuccessResult,
  Buyer as ProtoBuyer,
  WmsAppCapabilities as ProtoWmsAppCapabilities,
  WmsOperationOptions as ProtoWmsOperationOptions,
  WmsDeliveryV2 as ProtoWmsDeliveryV2,
  WmsGetAppConfigsInput as ProtoWmsGetAppConfigsInput,
  WmsGetAppConfigsOutput as ProtoWmsGetAppConfigsOutput,
  WmsIdentifier as ProtoWmsIdentifier,
  WmsOrderActionRequest as ProtoWmsOrderActionRequest,
  WmsOrderActionResult as ProtoWmsOrderActionResult,
  WmsOrderChangeShippingAddressInput as ProtoWmsOrderChangeShippingAddressInput,
  WmsOrderGetOrdersRequest as ProtoWmsOrderGetOrdersRequest,
  WmsOrderGetOrdersResult as ProtoWmsOrderGetOrdersResult,
  WmsOrderItemV2 as ProtoWmsOrderItemV2,
  WmsOrderV2 as ProtoWmsOrderV2,
  CommerceOrder as ProtoCommerceOrder,
  CommerceOrderItem as ProtoCommerceOrderItem,
  CommerceIdentifier as ProtoCommerceIdentifier,
  CommerceGetOrdersInput as ProtoCommerceGetOrdersInput,
  CommerceGetOrdersOutput as ProtoCommerceGetOrdersOutput,
  CommerceAppCapabilities as ProtoCommerceAppCapabilities,
  CommerceGetAppConfigsOutput as ProtoCommerceGetAppConfigsOutput,
  CommerceActionResult as ProtoCommerceActionResult,
  CommerceCancelOrderInput as ProtoCommerceCancelOrderInput,
  CommerceReturnOrderInput as ProtoCommerceReturnOrderInput,
  CommerceAcceptReturnOrderInput as ProtoCommerceAcceptReturnOrderInput,
  CommerceExchangeOrderInput as ProtoCommerceExchangeOrderInput,
  CommerceGetExchangeableItemsInput as ProtoCommerceGetExchangeableItemsInput,
  CommerceGetExchangeableItemsOutput as ProtoCommerceGetExchangeableItemsOutput,
  CommerceChangeShippingAddressInput as ProtoCommerceChangeShippingAddressInput,
  OrderClaimItem as ProtoOrderClaimItem,
  OrderExchangeItem as ProtoOrderExchangeItem,
} from "../gen/channel/app/sdk/v1/extension.js";
import type * as AlfTaskSchemas from "./alftask.js";
import type * as ApiKeySchemas from "./apikey.js";
import type * as CalendarSchemas from "./calendar.js";
import type * as CommandSchemas from "./command.js";
import type * as ConfigSchemas from "./config.js";
import type * as CustomTabSchemas from "./customtab.js";
import type * as DataSourceSchemas from "./datasource.js";
import type * as HookSchemas from "./hook.js";
import type * as MailRelaySchemas from "./mail-relay.js";
import type * as MessagingSchemas from "./messaging.js";
import type * as NotebookSchemas from "./notebook.js";
import type * as OAuthSchemas from "./oauth.js";
import type * as OrderSchemas from "./order.js";
import type * as PollingSchemas from "./polling.js";
import type * as StoreSchemas from "./store.js";
import type * as WidgetSchemas from "./widget.js";
import type * as WmsSchemas from "./wms.js";
import type * as CommerceSchemas from "./commerce.js";

type Expect<T extends true> = T;
type SchemaOutput<Schema extends z.ZodTypeAny> = z.output<Schema>;
type IsAssignable<Actual, Expected> = [Actual] extends [Expected] ? true : false;
type SchemaOutputExtendsProto<Schema extends z.ZodTypeAny, Proto> = IsAssignable<
  SchemaOutput<Schema>,
  Proto
>;

// Compile-time contract: extension Zod schemas may add validation, defaults,
// and passthrough behavior, but their parsed output must stay assignable to
// the generated proto type. This keeps proto as the cross-SDK DTO source of
// truth while preserving the existing TypeScript runtime validation API.
export type ExtensionProtoSchemaContracts = [
  Expect<
    SchemaOutputExtendsProto<
      typeof AlfTaskSchemas.MemoryDefinitionSchema,
      ProtoAlfTaskMemoryDefinition
    >
  >,
  Expect<
    SchemaOutputExtendsProto<typeof AlfTaskSchemas.WorkflowNodeSchema, ProtoAlfTaskWorkflowNode>
  >,
  Expect<
    SchemaOutputExtendsProto<typeof AlfTaskSchemas.PredefinedTaskSchema, ProtoAlfTaskPredefinedTask>
  >,
  Expect<
    SchemaOutputExtendsProto<
      typeof AlfTaskSchemas.GetAlfTasksResponseSchema,
      ProtoAlfTaskGetTasksOutput
    >
  >,

  Expect<SchemaOutputExtendsProto<typeof NotebookSchemas.NotebookCellSchema, ProtoNotebookCell>>,
  Expect<
    SchemaOutputExtendsProto<
      typeof NotebookSchemas.NotebookLayoutColumnSchema,
      ProtoNotebookLayoutColumn
    >
  >,
  Expect<
    SchemaOutputExtendsProto<typeof NotebookSchemas.NotebookLayoutRowSchema, ProtoNotebookLayoutRow>
  >,
  Expect<SchemaOutputExtendsProto<typeof NotebookSchemas.NotebookTabSchema, ProtoNotebookTab>>,
  Expect<
    SchemaOutputExtendsProto<typeof NotebookSchemas.NotebookPayloadSchema, ProtoNotebookPayload>
  >,
  Expect<SchemaOutputExtendsProto<typeof NotebookSchemas.AppNotebookSchema, ProtoAppNotebook>>,
  Expect<
    SchemaOutputExtendsProto<
      typeof NotebookSchemas.GetNotebooksResponseSchema,
      ProtoNotebookGetNotebooksOutput
    >
  >,

  Expect<SchemaOutputExtendsProto<typeof ApiKeySchemas.ApiKeyFieldSchema, ProtoApiKeyField>>,
  Expect<
    SchemaOutputExtendsProto<
      typeof ApiKeySchemas.GetAuthConfigOutputSchema,
      ProtoApiKeyGetAuthConfigOutput
    >
  >,
  Expect<
    SchemaOutputExtendsProto<
      typeof ApiKeySchemas.ValidateCredentialsOutputSchema,
      ProtoApiKeyValidateCredentialsOutput
    >
  >,

  Expect<SchemaOutputExtendsProto<typeof CalendarSchemas.CalendarSchema, ProtoCalendar>>,
  Expect<SchemaOutputExtendsProto<typeof CalendarSchemas.EventTypeSchema, ProtoCalendarEventType>>,
  Expect<SchemaOutputExtendsProto<typeof CalendarSchemas.TimeSlotSchema, ProtoCalendarTimeSlot>>,
  Expect<SchemaOutputExtendsProto<typeof CalendarSchemas.AttendeeSchema, ProtoCalendarAttendee>>,
  Expect<SchemaOutputExtendsProto<typeof CalendarSchemas.BookingSchema, ProtoCalendarBooking>>,

  Expect<
    SchemaOutputExtendsProto<typeof CommandSchemas.CommandNameI18nSchema, ProtoCommandNameI18n>
  >,
  Expect<
    SchemaOutputExtendsProto<
      typeof CommandSchemas.CommandNameDescI18nSchema,
      ProtoCommandNameDescI18n
    >
  >,
  Expect<
    SchemaOutputExtendsProto<
      typeof CommandSchemas.CommandParamDefI18nSchema,
      ProtoCommandParamDefI18n
    >
  >,
  Expect<SchemaOutputExtendsProto<typeof CommandSchemas.CommandChoiceSchema, ProtoCommandChoice>>,
  Expect<
    SchemaOutputExtendsProto<
      typeof CommandSchemas.CommandParamDefinitionSchema,
      ProtoCommandParamDefinition
    >
  >,
  Expect<SchemaOutputExtendsProto<typeof CommandSchemas.CommandConfigSchema, ProtoCommandConfig>>,
  Expect<
    SchemaOutputExtendsProto<
      typeof CommandSchemas.GetCommandsOutputSchema,
      ProtoCommandGetCommandsOutput
    >
  >,
  Expect<SchemaOutputExtendsProto<typeof CommandSchemas.CommandResultSchema, ProtoCommandResult>>,

  Expect<
    SchemaOutputExtendsProto<typeof ConfigSchemas.ConfigConditionSchema, ProtoConfigCondition>
  >,
  Expect<SchemaOutputExtendsProto<typeof ConfigSchemas.ConfigChoiceSchema, ProtoConfigChoice>>,
  Expect<
    SchemaOutputExtendsProto<typeof ConfigSchemas.ConfigInlineLinkSchema, ProtoConfigInlineLink>
  >,
  Expect<
    SchemaOutputExtendsProto<
      typeof ConfigSchemas.ConfigValidationNoticeSchema,
      ProtoConfigValidationNotice
    >
  >,
  Expect<SchemaOutputExtendsProto<typeof ConfigSchemas.ConfigHooksSchema, ProtoConfigHooks>>,
  Expect<
    SchemaOutputExtendsProto<
      typeof ConfigSchemas.ConfigOAuthAdditionalParamSchema,
      ProtoConfigOAuthAdditionalParam
    >
  >,
  Expect<SchemaOutputExtendsProto<typeof ConfigSchemas.ConfigOAuthSchema, ProtoConfigOAuth>>,
  Expect<
    SchemaOutputExtendsProto<
      typeof ConfigSchemas.ConfigChoicesSourceSchema,
      ProtoConfigChoicesSource
    >
  >,
  Expect<
    SchemaOutputExtendsProto<
      typeof ConfigSchemas.ConfigDraftResolutionParamsSchema,
      ProtoConfigDraftResolutionParams
    >
  >,
  Expect<
    SchemaOutputExtendsProto<
      typeof ConfigSchemas.ConfigResolvedValueTargetSchema,
      ProtoConfigResolvedValueTarget
    >
  >,
  Expect<SchemaOutputExtendsProto<typeof ConfigSchemas.ConfigFieldSchema, ProtoConfigField>>,
  Expect<SchemaOutputExtendsProto<typeof ConfigSchemas.ConfigBlockSchema, ProtoConfigBlock>>,
  Expect<
    SchemaOutputExtendsProto<
      typeof ConfigSchemas.GetConfigSchemaOutputSchema,
      ProtoConfigGetConfigSchemaOutput
    >
  >,
  Expect<
    SchemaOutputExtendsProto<
      typeof ConfigSchemas.ConfigValidationErrorSchema,
      ProtoConfigValidationError
    >
  >,
  Expect<
    SchemaOutputExtendsProto<
      typeof ConfigSchemas.ValidateStoredConfigOutputSchema,
      ProtoConfigValidateStoredConfigOutput
    >
  >,
  Expect<
    SchemaOutputExtendsProto<
      typeof ConfigSchemas.ConfigDraftResolutionOutputSchema,
      ProtoConfigDraftResolutionOutput
    >
  >,

  Expect<
    SchemaOutputExtendsProto<
      typeof CustomTabSchemas.CustomTabNameI18nSchema,
      ProtoCustomTabNameI18n
    >
  >,
  Expect<
    SchemaOutputExtendsProto<typeof CustomTabSchemas.CustomTabConfigSchema, ProtoCustomTabConfig>
  >,
  Expect<
    SchemaOutputExtendsProto<
      typeof CustomTabSchemas.GetCustomTabsOutputSchema,
      ProtoCustomTabGetCustomTabsOutput
    >
  >,
  Expect<
    SchemaOutputExtendsProto<
      typeof CustomTabSchemas.CustomTabActionResultSchema,
      ProtoCustomTabActionResult
    >
  >,

  Expect<
    SchemaOutputExtendsProto<
      typeof DataSourceSchemas.DataSourceCatalogSchema,
      ProtoDataSourceCatalog
    >
  >,
  Expect<
    SchemaOutputExtendsProto<typeof DataSourceSchemas.DataSourceTableSchema, ProtoDataSourceTable>
  >,
  Expect<
    SchemaOutputExtendsProto<typeof DataSourceSchemas.DataSourceColumnSchema, ProtoDataSourceColumn>
  >,
  Expect<
    SchemaOutputExtendsProto<
      typeof DataSourceSchemas.DataSourceTableDefinitionSchema,
      ProtoDataSourceTableDefinition
    >
  >,
  Expect<
    SchemaOutputExtendsProto<
      typeof DataSourceSchemas.DataSourceTableListingSchema,
      ProtoDataSourceTableListing
    >
  >,
  Expect<
    SchemaOutputExtendsProto<
      typeof DataSourceSchemas.ListCatalogsInputSchema,
      ProtoDataSourceListCatalogsInput
    >
  >,
  Expect<
    SchemaOutputExtendsProto<
      typeof DataSourceSchemas.ListCatalogsOutputSchema,
      ProtoDataSourceListCatalogsOutput
    >
  >,
  Expect<
    SchemaOutputExtendsProto<
      typeof DataSourceSchemas.ListTablesInputSchema,
      ProtoDataSourceListTablesInput
    >
  >,
  Expect<
    SchemaOutputExtendsProto<
      typeof DataSourceSchemas.ListTablesOutputSchema,
      ProtoDataSourceListTablesOutput
    >
  >,
  Expect<
    SchemaOutputExtendsProto<
      typeof DataSourceSchemas.DescribeTableInputSchema,
      ProtoDataSourceDescribeTableInput
    >
  >,
  Expect<
    SchemaOutputExtendsProto<
      typeof DataSourceSchemas.DescribeTableOutputSchema,
      ProtoDataSourceDescribeTableOutput
    >
  >,
  Expect<
    SchemaOutputExtendsProto<
      typeof DataSourceSchemas.DataSourceQueryTableAccessSchema,
      ProtoDataSourceQueryTableAccess
    >
  >,
  Expect<
    SchemaOutputExtendsProto<
      typeof DataSourceSchemas.AuthorizeQueryInputSchema,
      ProtoDataSourceAuthorizeQueryInput
    >
  >,
  Expect<
    SchemaOutputExtendsProto<
      typeof DataSourceSchemas.DataSourceQueryFilterSchema,
      ProtoDataSourceQueryFilter
    >
  >,
  Expect<
    SchemaOutputExtendsProto<
      typeof DataSourceSchemas.AuthorizeQueryOutputSchema,
      ProtoDataSourceAuthorizeQueryOutput
    >
  >,

  Expect<SchemaOutputExtendsProto<typeof HookSchemas.WebhookConfigSchema, ProtoHookWebhookConfig>>,
  Expect<SchemaOutputExtendsProto<typeof HookSchemas.HookConfigSchema, ProtoHookConfig>>,
  Expect<
    SchemaOutputExtendsProto<typeof HookSchemas.GetHooksOutputSchema, ProtoHookGetHooksOutput>
  >,

  Expect<
    SchemaOutputExtendsProto<
      typeof MessagingSchemas.MessagingAlfMessageTypeSchema,
      ProtoMessagingAlfMessageType
    >
  >,
  Expect<
    SchemaOutputExtendsProto<
      typeof MessagingSchemas.MessagingMeetModeSchema,
      ProtoMessagingMeetMode
    >
  >,
  Expect<
    SchemaOutputExtendsProto<
      typeof MessagingSchemas.MessagingMessageMeetStateSchema,
      ProtoMessagingMessageMeetState
    >
  >,
  Expect<
    SchemaOutputExtendsProto<
      typeof MessagingSchemas.MessagingMessageStateSchema,
      ProtoMessagingMessageState
    >
  >,
  Expect<
    SchemaOutputExtendsProto<
      typeof MessagingSchemas.MessagingMessageColorVariantSchema,
      ProtoMessagingMessageColorVariant
    >
  >,
  Expect<
    SchemaOutputExtendsProto<
      typeof MessagingSchemas.MessagingMessageOptionSchema,
      ProtoMessagingMessageOption
    >
  >,
  Expect<
    SchemaOutputExtendsProto<
      typeof MessagingSchemas.MessagingMessageAlertLevelSchema,
      ProtoMessagingMessageAlertLevel
    >
  >,
  Expect<
    SchemaOutputExtendsProto<
      typeof MessagingSchemas.MessagingWritingTypeSchema,
      ProtoMessagingWritingType
    >
  >,
  Expect<
    SchemaOutputExtendsProto<
      typeof MessagingSchemas.MessagingUserChatStateSchema,
      ProtoMessagingUserChatState
    >
  >,
  Expect<
    SchemaOutputExtendsProto<
      typeof MessagingSchemas.MessagingUserChatGoalStateSchema,
      ProtoMessagingUserChatGoalState
    >
  >,
  Expect<
    SchemaOutputExtendsProto<
      typeof MessagingSchemas.MessagingUserChatSubtextTypeSchema,
      ProtoMessagingUserChatSubtextType
    >
  >,
  Expect<
    SchemaOutputExtendsProto<
      typeof MessagingSchemas.MessagingMissedReasonSchema,
      ProtoMessagingMissedReason
    >
  >,
  Expect<
    SchemaOutputExtendsProto<
      typeof MessagingSchemas.MessagingUserTypeSchema,
      ProtoMessagingUserType
    >
  >,
  Expect<SchemaOutputExtendsProto<typeof MessagingSchemas.MessagingAlfSchema, ProtoMessagingAlf>>,
  Expect<SchemaOutputExtendsProto<typeof MessagingSchemas.MessagingMeetSchema, ProtoMessagingMeet>>,
  Expect<
    SchemaOutputExtendsProto<
      typeof MessagingSchemas.MessagingMessageFileSchema,
      ProtoMessagingMessageFile
    >
  >,
  Expect<
    SchemaOutputExtendsProto<
      typeof MessagingSchemas.MessagingMessageThreadSchema,
      ProtoMessagingMessageThread
    >
  >,
  Expect<
    SchemaOutputExtendsProto<
      typeof MessagingSchemas.MessagingMessageButtonSchema,
      ProtoMessagingMessageButton
    >
  >,
  Expect<
    SchemaOutputExtendsProto<
      typeof MessagingSchemas.MessagingCustomPayloadSchema,
      ProtoMessagingCustomPayload
    >
  >,
  Expect<
    SchemaOutputExtendsProto<typeof MessagingSchemas.MessagingMessageSchema, ProtoMessagingMessage>
  >,
  Expect<
    SchemaOutputExtendsProto<
      typeof MessagingSchemas.MessagingPrebuiltMessageSchema,
      ProtoMessagingPrebuiltMessage
    >
  >,
  Expect<
    SchemaOutputExtendsProto<
      typeof MessagingSchemas.MessagingUserChatSchema,
      ProtoMessagingUserChat
    >
  >,
  Expect<SchemaOutputExtendsProto<typeof MessagingSchemas.MessagingUserSchema, ProtoMessagingUser>>,
  Expect<
    SchemaOutputExtendsProto<
      typeof MessagingSchemas.MessagingWamResultSchema,
      ProtoMessagingWamResult
    >
  >,
  Expect<
    SchemaOutputExtendsProto<
      typeof MessagingSchemas.MessagingUnavailableReasonSchema,
      ProtoMessagingUnavailableReason
    >
  >,
  Expect<
    SchemaOutputExtendsProto<
      typeof MessagingSchemas.MessagingWritingTypeStateSchema,
      ProtoMessagingWritingTypeState
    >
  >,
  Expect<
    SchemaOutputExtendsProto<
      typeof MessagingSchemas.MessagingWritingTypeMapSchema,
      ProtoMessagingWritingTypeMap
    >
  >,
  Expect<
    SchemaOutputExtendsProto<
      typeof MessagingSchemas.MessagingMediumProfileSchema,
      ProtoMessagingMediumProfile
    >
  >,
  Expect<
    SchemaOutputExtendsProto<
      typeof MessagingSchemas.OnMediumMessageCreatedInputSchema,
      ProtoOnMediumMessageCreatedInput
    >
  >,
  Expect<
    SchemaOutputExtendsProto<
      typeof MessagingSchemas.OnMediumMessageCreatedOutputSchema,
      ProtoOnMediumMessageCreatedOutput
    >
  >,
  Expect<
    SchemaOutputExtendsProto<
      typeof MessagingSchemas.InboxOnMediumUserChatClosedInputSchema,
      ProtoInboxOnMediumUserChatClosedInput
    >
  >,
  Expect<
    SchemaOutputExtendsProto<
      typeof MessagingSchemas.InboxOnMediumUserChatClosedOutputSchema,
      ProtoInboxOnMediumUserChatClosedOutput
    >
  >,
  Expect<
    SchemaOutputExtendsProto<
      typeof MessagingSchemas.InboxGetWritingTypesInputSchema,
      ProtoInboxGetWritingTypesInput
    >
  >,
  Expect<
    SchemaOutputExtendsProto<
      typeof MessagingSchemas.InboxGetWritingTypesOutputSchema,
      ProtoInboxGetWritingTypesOutput
    >
  >,
  Expect<
    SchemaOutputExtendsProto<
      typeof MessagingSchemas.InboxGetCustomEditorWamInputSchema,
      ProtoInboxGetCustomEditorWamInput
    >
  >,
  Expect<
    SchemaOutputExtendsProto<
      typeof MessagingSchemas.InboxGetMediumTopicSelectorWamInputSchema,
      ProtoInboxGetMediumTopicSelectorWamInput
    >
  >,
  Expect<
    SchemaOutputExtendsProto<
      typeof MessagingSchemas.InboxGetMediumMessageErrorReasonInputSchema,
      ProtoInboxGetMediumMessageErrorReasonInput
    >
  >,
  Expect<
    SchemaOutputExtendsProto<
      typeof MessagingSchemas.InboxGetMediumMessageErrorReasonOutputSchema,
      ProtoInboxGetMediumMessageErrorReasonOutput
    >
  >,
  Expect<
    SchemaOutputExtendsProto<
      typeof MessagingSchemas.PrebuiltGetWritingTypesInputSchema,
      ProtoPrebuiltGetWritingTypesInput
    >
  >,
  Expect<
    SchemaOutputExtendsProto<
      typeof MessagingSchemas.PrebuiltGetWritingTypesOutputSchema,
      ProtoPrebuiltGetWritingTypesOutput
    >
  >,
  Expect<
    SchemaOutputExtendsProto<
      typeof MessagingSchemas.PrebuiltValidateEntityInputSchema,
      ProtoPrebuiltValidateEntityInput
    >
  >,
  Expect<
    SchemaOutputExtendsProto<
      typeof MessagingSchemas.PrebuiltValidateEntityOutputSchema,
      ProtoPrebuiltValidateEntityOutput
    >
  >,
  Expect<
    SchemaOutputExtendsProto<
      typeof MessagingSchemas.PrebuiltGetCustomEditorWamInputSchema,
      ProtoPrebuiltGetCustomEditorWamInput
    >
  >,
  Expect<
    SchemaOutputExtendsProto<
      typeof MessagingSchemas.PrebuiltGetMediumTopicBuilderSelectorWamInputSchema,
      ProtoPrebuiltGetMediumTopicBuilderSelectorWamInput
    >
  >,
  Expect<
    SchemaOutputExtendsProto<
      typeof MessagingSchemas.PrebuiltBuildMediumTopicsInputSchema,
      ProtoPrebuiltBuildMediumTopicsInput
    >
  >,
  Expect<
    SchemaOutputExtendsProto<
      typeof MessagingSchemas.PrebuiltBuildMediumTopicsOutputSchema,
      ProtoPrebuiltBuildMediumTopicsOutput
    >
  >,
  Expect<
    SchemaOutputExtendsProto<
      typeof MessagingSchemas.PrebuiltGetDefaultOptionsInputSchema,
      ProtoPrebuiltGetDefaultOptionsInput
    >
  >,
  Expect<
    SchemaOutputExtendsProto<
      typeof MessagingSchemas.PrebuiltGetDefaultOptionsOutputSchema,
      ProtoPrebuiltGetDefaultOptionsOutput
    >
  >,

  Expect<SchemaOutputExtendsProto<typeof OAuthSchemas.OAuthProviderSchema, ProtoOAuthProvider>>,
  Expect<SchemaOutputExtendsProto<typeof OAuthSchemas.OAuthConfigSchema, ProtoOAuthConfig>>,
  Expect<
    SchemaOutputExtendsProto<
      typeof OAuthSchemas.CredentialValidationInputSchema,
      ProtoOAuthCredentialValidationInput
    >
  >,
  Expect<
    SchemaOutputExtendsProto<
      typeof OAuthSchemas.CredentialValidationResultSchema,
      ProtoOAuthCredentialValidationResult
    >
  >,

  Expect<SchemaOutputExtendsProto<typeof OrderSchemas.AddressSchema, ProtoOrderAddress>>,
  Expect<SchemaOutputExtendsProto<typeof OrderSchemas.BankAccountSchema, ProtoOrderBankAccount>>,
  Expect<SchemaOutputExtendsProto<typeof OrderSchemas.DefectInfoSchema, ProtoOrderDefectInfo>>,
  Expect<SchemaOutputExtendsProto<typeof OrderSchemas.ClaimReasonSchema, ProtoOrderClaimReason>>,
  Expect<SchemaOutputExtendsProto<typeof OrderSchemas.ClaimabilitySchema, ProtoOrderClaimability>>,
  Expect<SchemaOutputExtendsProto<typeof OrderSchemas.ClaimSchema, ProtoOrderClaim>>,
  Expect<SchemaOutputExtendsProto<typeof OrderSchemas.OrderItemSchema, ProtoOrderItem>>,
  Expect<SchemaOutputExtendsProto<typeof OrderSchemas.PaymentSchema, ProtoOrderPayment>>,
  Expect<SchemaOutputExtendsProto<typeof OrderSchemas.FulfillmentSchema, ProtoOrderFulfillment>>,
  Expect<SchemaOutputExtendsProto<typeof OrderSchemas.OrderSchema, ProtoOrder>>,
  Expect<SchemaOutputExtendsProto<typeof OrderSchemas.FieldConfigSchema, ProtoOrderFieldConfig>>,
  Expect<
    SchemaOutputExtendsProto<typeof OrderSchemas.OperationOptionsSchema, ProtoOrderOperationOptions>
  >,
  Expect<
    SchemaOutputExtendsProto<typeof OrderSchemas.AppCapabilitiesSchema, ProtoOrderAppCapabilities>
  >,

  Expect<SchemaOutputExtendsProto<typeof PollingSchemas.PollingPollerSchema, ProtoPollingPoller>>,
  Expect<
    SchemaOutputExtendsProto<
      typeof PollingSchemas.GetPollersOutputSchema,
      ProtoPollingGetPollersOutput
    >
  >,
  Expect<
    SchemaOutputExtendsProto<
      typeof PollingSchemas.GetPollingTargetChannelsInputSchema,
      ProtoPollingGetTargetChannelsInput
    >
  >,
  Expect<
    SchemaOutputExtendsProto<
      typeof PollingSchemas.GetPollingTargetChannelsOutputSchema,
      ProtoPollingGetTargetChannelsOutput
    >
  >,
  Expect<
    SchemaOutputExtendsProto<
      typeof PollingSchemas.PollingManagerTargetSchema,
      ProtoPollingManagerTarget
    >
  >,
  Expect<
    SchemaOutputExtendsProto<
      typeof PollingSchemas.GetPollingTargetManagersInputSchema,
      ProtoPollingGetTargetManagersInput
    >
  >,
  Expect<
    SchemaOutputExtendsProto<
      typeof PollingSchemas.GetPollingTargetManagersOutputSchema,
      ProtoPollingGetTargetManagersOutput
    >
  >,

  Expect<
    SchemaOutputExtendsProto<typeof MailRelaySchemas.MailRelayHeaderSchema, ProtoMailRelayHeader>
  >,
  Expect<
    SchemaOutputExtendsProto<
      typeof MailRelaySchemas.MailRelayCommonHeadersSchema,
      ProtoMailRelayCommonHeaders
    >
  >,
  Expect<SchemaOutputExtendsProto<typeof MailRelaySchemas.MailRelayMailSchema, ProtoMailRelayMail>>,
  Expect<
    SchemaOutputExtendsProto<typeof MailRelaySchemas.MailRelayReceiptSchema, ProtoMailRelayReceipt>
  >,
  Expect<
    SchemaOutputExtendsProto<
      typeof MailRelaySchemas.MailRelayInboundInputSchema,
      ProtoMailRelayInboundInput
    >
  >,
  Expect<
    SchemaOutputExtendsProto<
      typeof MailRelaySchemas.MailRelayInboundOutputSchema,
      ProtoMailRelayInboundOutput
    >
  >,

  Expect<
    SchemaOutputExtendsProto<typeof StoreSchemas.StoreProfileImageSchema, ProtoStoreProfileImage>
  >,
  Expect<
    SchemaOutputExtendsProto<typeof StoreSchemas.StoreProfileIntroSchema, ProtoStoreProfileIntro>
  >,
  Expect<SchemaOutputExtendsProto<typeof StoreSchemas.StoreFaqSchema, ProtoStoreFaq>>,
  Expect<
    SchemaOutputExtendsProto<
      typeof StoreSchemas.StoreProfileLocalizedContentSchema,
      ProtoStoreProfileLocalizedContent
    >
  >,
  Expect<
    SchemaOutputExtendsProto<
      typeof StoreSchemas.GetStoreProfileInputSchema,
      ProtoStoreGetProfileInput
    >
  >,
  Expect<
    SchemaOutputExtendsProto<
      typeof StoreSchemas.GetStoreProfileOutputSchema,
      ProtoStoreGetProfileOutput
    >
  >,

  Expect<
    SchemaOutputExtendsProto<typeof WidgetSchemas.NameDescI18nSchema, ProtoWidgetNameDescI18n>
  >,
  Expect<SchemaOutputExtendsProto<typeof WidgetSchemas.WidgetConfigSchema, ProtoWidgetConfig>>,
  Expect<
    SchemaOutputExtendsProto<
      typeof WidgetSchemas.GetWidgetsOutputSchema,
      ProtoWidgetGetWidgetsOutput
    >
  >,
  Expect<
    SchemaOutputExtendsProto<typeof WidgetSchemas.WidgetActionResultSchema, ProtoWidgetActionResult>
  >,

  Expect<SchemaOutputExtendsProto<typeof OrderSchemas.BuyerSchema, ProtoBuyer>>,
  Expect<
    SchemaOutputExtendsProto<typeof CommerceSchemas.CommerceOrderItemSchema, ProtoCommerceOrderItem>
  >,
  Expect<SchemaOutputExtendsProto<typeof CommerceSchemas.CommerceOrderSchema, ProtoCommerceOrder>>,
  Expect<
    SchemaOutputExtendsProto<
      typeof CommerceSchemas.CommerceIdentifierSchema,
      ProtoCommerceIdentifier
    >
  >,
  Expect<
    SchemaOutputExtendsProto<
      typeof CommerceSchemas.CommerceGetOrdersInputSchema,
      ProtoCommerceGetOrdersInput
    >
  >,
  Expect<
    SchemaOutputExtendsProto<
      typeof CommerceSchemas.CommerceGetOrdersOutputSchema,
      ProtoCommerceGetOrdersOutput
    >
  >,
  Expect<
    SchemaOutputExtendsProto<
      typeof CommerceSchemas.CommerceAppCapabilitiesSchema,
      ProtoCommerceAppCapabilities
    >
  >,
  Expect<
    SchemaOutputExtendsProto<
      typeof CommerceSchemas.CommerceGetAppConfigsOutputSchema,
      ProtoCommerceGetAppConfigsOutput
    >
  >,
  Expect<
    SchemaOutputExtendsProto<typeof CommerceSchemas.CommerceResultSchema, ProtoCommerceActionResult>
  >,
  Expect<
    SchemaOutputExtendsProto<
      typeof CommerceSchemas.CommerceCancelOrderInputSchema,
      ProtoCommerceCancelOrderInput
    >
  >,
  Expect<
    SchemaOutputExtendsProto<
      typeof CommerceSchemas.CommerceReturnOrderInputSchema,
      ProtoCommerceReturnOrderInput
    >
  >,
  Expect<
    SchemaOutputExtendsProto<
      typeof CommerceSchemas.CommerceAcceptReturnOrderInputSchema,
      ProtoCommerceAcceptReturnOrderInput
    >
  >,
  Expect<
    SchemaOutputExtendsProto<
      typeof CommerceSchemas.CommerceExchangeOrderInputSchema,
      ProtoCommerceExchangeOrderInput
    >
  >,
  Expect<
    SchemaOutputExtendsProto<
      typeof CommerceSchemas.CommerceGetExchangeableItemsInputSchema,
      ProtoCommerceGetExchangeableItemsInput
    >
  >,
  Expect<
    SchemaOutputExtendsProto<
      typeof CommerceSchemas.CommerceGetExchangeableItemsOutputSchema,
      ProtoCommerceGetExchangeableItemsOutput
    >
  >,
  Expect<
    SchemaOutputExtendsProto<
      typeof CommerceSchemas.CommerceChangeShippingAddressInputSchema,
      ProtoCommerceChangeShippingAddressInput
    >
  >,
  Expect<SchemaOutputExtendsProto<typeof OrderSchemas.OrderClaimItemSchema, ProtoOrderClaimItem>>,
  Expect<
    SchemaOutputExtendsProto<typeof OrderSchemas.OrderExchangeItemSchema, ProtoOrderExchangeItem>
  >,
  Expect<SchemaOutputExtendsProto<typeof WmsSchemas.WmsShippingInfoSchema, ProtoWmsShippingInfo>>,
  Expect<SchemaOutputExtendsProto<typeof WmsSchemas.WmsDeliverySchema, ProtoWmsDelivery>>,
  Expect<SchemaOutputExtendsProto<typeof WmsSchemas.WmsOrderItemSchema, ProtoWmsOrderItem>>,
  Expect<SchemaOutputExtendsProto<typeof WmsSchemas.WmsOrderSchema, ProtoWmsOrder>>,
  Expect<SchemaOutputExtendsProto<typeof WmsSchemas.WmsDeliveryV2Schema, ProtoWmsDeliveryV2>>,
  Expect<SchemaOutputExtendsProto<typeof WmsSchemas.WmsOrderItemV2Schema, ProtoWmsOrderItemV2>>,
  Expect<SchemaOutputExtendsProto<typeof WmsSchemas.WmsOrderV2Schema, ProtoWmsOrderV2>>,
  Expect<SchemaOutputExtendsProto<typeof WmsSchemas.WmsIdentifierSchema, ProtoWmsIdentifier>>,
  Expect<
    SchemaOutputExtendsProto<
      typeof WmsSchemas.WmsOrderGetOrdersInputSchema,
      ProtoWmsOrderGetOrdersRequest
    >
  >,
  Expect<
    SchemaOutputExtendsProto<
      typeof WmsSchemas.WmsOrderGetOrdersOutputSchema,
      ProtoWmsOrderGetOrdersResult
    >
  >,
  Expect<
    SchemaOutputExtendsProto<
      typeof WmsSchemas.WmsOrderActionInputSchema,
      ProtoWmsOrderActionRequest
    >
  >,
  Expect<
    SchemaOutputExtendsProto<
      typeof WmsSchemas.WmsOrderActionOutputSchema,
      ProtoWmsOrderActionResult
    >
  >,
  Expect<
    SchemaOutputExtendsProto<
      typeof WmsSchemas.WmsOrderChangeShippingAddressInputSchema,
      ProtoWmsOrderChangeShippingAddressInput
    >
  >,
  Expect<
    SchemaOutputExtendsProto<
      typeof WmsSchemas.WmsGetAppConfigsInputSchema,
      ProtoWmsGetAppConfigsInput
    >
  >,
  Expect<
    SchemaOutputExtendsProto<
      typeof WmsSchemas.WmsGetAppConfigsOutputSchema,
      ProtoWmsGetAppConfigsOutput
    >
  >,
  Expect<
    SchemaOutputExtendsProto<typeof WmsSchemas.WmsAppCapabilitiesSchema, ProtoWmsAppCapabilities>
  >,
  Expect<
    SchemaOutputExtendsProto<typeof WmsSchemas.WmsOperationOptionsSchema, ProtoWmsOperationOptions>
  >,
  Expect<
    SchemaOutputExtendsProto<typeof WmsSchemas.GetWmsOrdersInputSchema, ProtoWmsGetOrdersRequest>
  >,
  Expect<
    SchemaOutputExtendsProto<typeof WmsSchemas.GetWmsOrdersOutputSchema, ProtoWmsGetOrdersResult>
  >,
  Expect<
    SchemaOutputExtendsProto<typeof WmsSchemas.GetWmsOrderInputSchema, ProtoWmsGetOrderRequest>
  >,
  Expect<
    SchemaOutputExtendsProto<typeof WmsSchemas.GetWmsOrderOutputSchema, ProtoWmsGetOrderResult>
  >,
  Expect<
    SchemaOutputExtendsProto<typeof WmsSchemas.GetWmsShopIdInputSchema, ProtoWmsGetShopIDRequest>
  >,
  Expect<
    SchemaOutputExtendsProto<typeof WmsSchemas.GetWmsShopIdOutputSchema, ProtoWmsGetShopIDResult>
  >,
  Expect<
    SchemaOutputExtendsProto<
      typeof WmsSchemas.GetWmsSupportedCommercesInputSchema,
      ProtoWmsGetSupportedCommercesRequest
    >
  >,
  Expect<
    SchemaOutputExtendsProto<
      typeof WmsSchemas.GetWmsSupportedCommercesOutputSchema,
      ProtoWmsGetSupportedCommercesResult
    >
  >,
  Expect<
    SchemaOutputExtendsProto<typeof WmsSchemas.CancelWmsOrderInputSchema, ProtoWmsOrderStateRequest>
  >,
  Expect<
    SchemaOutputExtendsProto<typeof WmsSchemas.ReturnWmsOrderInputSchema, ProtoWmsOrderStateRequest>
  >,
  Expect<
    SchemaOutputExtendsProto<
      typeof WmsSchemas.ExchangeWmsOrderInputSchema,
      ProtoWmsOrderStateRequest
    >
  >,
  Expect<
    SchemaOutputExtendsProto<
      typeof WmsSchemas.ChangeWmsShippingAddressInputSchema,
      ProtoWmsChangeShippingAddressRequest
    >
  >,
  Expect<
    SchemaOutputExtendsProto<
      typeof WmsSchemas.RestoreWmsOrderInputSchema,
      ProtoWmsRestoreOrderRequest
    >
  >,
  Expect<SchemaOutputExtendsProto<typeof WmsSchemas.WmsSuccessOutputSchema, ProtoWmsSuccessResult>>,
];
