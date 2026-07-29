import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { z } from "zod";
import {
  ApiKeyFieldSchema,
  AppCapabilitiesSchema,
  AddressSchema,
  AttendeeSchema,
  BankAccountSchema,
  BookingSchema,
  CalendarSchema,
  ChangeWmsShippingAddressInputSchema,
  ClaimabilitySchema,
  ClaimReasonSchema,
  ClaimSchema,
  CommandChoiceSchema,
  CommandConfigSchema,
  CommandNameDescI18nSchema,
  CommandNameI18nSchema,
  CommandParamDefI18nSchema,
  CommandParamDefinitionSchema,
  CommandResultSchema,
  ConfigBlockSchema,
  ConfigChoiceSchema,
  ConfigConditionSchema,
  ConfigChoicesSourceSchema,
  ConfigDraftResolutionOutputSchema,
  ConfigDraftResolutionParamsSchema,
  ConfigFieldSchema,
  ConfigHooksSchema,
  ConfigInlineLinkSchema,
  LocalizedConfigTextSchema,
  ConfigOAuthAdditionalParamSchema,
  ConfigOAuthSchema,
  ConfigResolvedValueTargetSchema,
  ConfigValidationErrorSchema,
  ConfigValidationNoticeSchema,
  CredentialValidationInputSchema,
  CredentialValidationResultSchema,
  CustomTabActionResultSchema,
  CustomTabConfigSchema,
  CustomTabNameI18nSchema,
  DataSourceCatalogSchema,
  DataSourceColumnSchema,
  DataSourceTableDefinitionSchema,
  DataSourceTableListingSchema,
  DataSourceTableSchema,
  DefectInfoSchema,
  DescribeTableInputSchema,
  DescribeTableOutputSchema,
  EventTypeSchema,
  FieldConfigSchema,
  FulfillmentSchema,
  GetAlfTasksInputSchema,
  GetAlfTasksResponseSchema,
  GetAuthConfigOutputSchema,
  GetCommandsOutputSchema,
  GetConfigSchemaOutputSchema,
  GetCustomTabsOutputSchema,
  GetHooksOutputSchema,
  GetNotebooksInputSchema,
  GetNotebooksResponseSchema,
  GetPollingTargetChannelsInputSchema,
  GetPollingTargetChannelsOutputSchema,
  GetPollingTargetManagersInputSchema,
  GetPollingTargetManagersOutputSchema,
  GetPollersOutputSchema,
  GetStoreProfileInputSchema,
  GetWidgetsOutputSchema,
  GetWmsOrderInputSchema,
  GetWmsOrderOutputSchema,
  GetWmsOrdersInputSchema,
  GetWmsOrdersOutputSchema,
  GetWmsShopIdInputSchema,
  GetWmsShopIdOutputSchema,
  GetWmsSupportedCommercesInputSchema,
  GetWmsSupportedCommercesOutputSchema,
  HookConfigSchema,
  InboxGetCustomEditorWamInputSchema,
  InboxGetMediumMessageErrorReasonInputSchema,
  InboxGetMediumMessageErrorReasonOutputSchema,
  InboxGetMediumTopicSelectorWamInputSchema,
  InboxGetWritingTypesInputSchema,
  InboxGetWritingTypesOutputSchema,
  InboxOnMediumUserChatClosedInputSchema,
  InboxOnMediumUserChatClosedOutputSchema,
  ListCatalogsInputSchema,
  ListCatalogsOutputSchema,
  ListTablesInputSchema,
  ListTablesOutputSchema,
  MailRelayCommonHeadersSchema,
  MailRelayHeaderSchema,
  MailRelayInboundInputSchema,
  MailRelayInboundOutputSchema,
  MailRelayMailSchema,
  MailRelayReceiptSchema,
  MemoryDefinitionSchema,
  MessagingAlfSchema,
  MessagingCustomPayloadSchema,
  MessagingMediumProfileSchema,
  MessagingMeetSchema,
  MessagingMessageButtonSchema,
  MessagingMessageFileSchema,
  MessagingMessageSchema,
  MessagingMessageThreadSchema,
  MessagingPrebuiltMessageSchema,
  MessagingUnavailableReasonSchema,
  MessagingUserChatSchema,
  MessagingUserSchema,
  MessagingWamResultSchema,
  MessagingWritingTypeMapSchema,
  MessagingWritingTypeStateSchema,
  NameDescI18nSchema,
  OAuthConfigSchema,
  OAuthProviderLocalizedTextSchema,
  OAuthProviderSchema,
  OAuthTokenRequestMappingSchema,
  OAuthTokenResponseMappingSchema,
  OnMediumMessageCreatedInputSchema,
  OnMediumMessageCreatedOutputSchema,
  OperationOptionsSchema,
  BuyerSchema,
  OrderItemSchema,
  OrderClaimItemSchema,
  OrderExchangeItemSchema,
  OrderSchema,
  PaymentSchema,
  AppNotebookSchema,
  NotebookCellSchema,
  NotebookLayoutColumnSchema,
  NotebookLayoutRowSchema,
  NotebookPayloadSchema,
  NotebookTabSchema,
  PollingPollerSchema,
  PollingManagerTargetSchema,
  PrebuiltBuildMediumTopicsInputSchema,
  PrebuiltBuildMediumTopicsOutputSchema,
  PrebuiltGetCustomEditorWamInputSchema,
  PrebuiltGetDefaultOptionsInputSchema,
  PrebuiltGetDefaultOptionsOutputSchema,
  PrebuiltGetMediumTopicBuilderSelectorWamInputSchema,
  PrebuiltGetWritingTypesInputSchema,
  PrebuiltGetWritingTypesOutputSchema,
  PrebuiltValidateEntityInputSchema,
  PrebuiltValidateEntityOutputSchema,
  PredefinedTaskSchema,
  RestoreWmsOrderInputSchema,
  StoreFaqSchema,
  StoreProfileImageSchema,
  StoreProfileIntroSchema,
  StoreProfileLocalizedContentSchema,
  StoreProfileMetadataSchema,
  TimeSlotSchema,
  ValidateCredentialsOutputSchema,
  ValidateStoredConfigOutputSchema,
  WebhookConfigSchema,
  WidgetActionResultSchema,
  WidgetConfigSchema,
  WmsDeliverySchema,
  WmsOrderItemSchema,
  WmsOrderSchema,
  WmsShippingInfoSchema,
  WmsSuccessOutputSchema,
  WorkflowNodeSchema,
} from "../../extensions/index.js";
import {
  CancelWmsOrderInputSchema,
  ExchangeWmsOrderInputSchema,
  ReturnWmsOrderInputSchema,
  WmsAppCapabilitiesSchema,
  WmsDeliveryV2Schema,
  WmsGetAppConfigsInputSchema,
  WmsGetAppConfigsOutputSchema,
  WmsIdentifierSchema,
  WmsOperationOptionsSchema,
  WmsOrderActionInputSchema,
  WmsOrderActionOutputSchema,
  WmsOrderChangeShippingAddressInputSchema,
  WmsOrderGetOrdersInputSchema,
  WmsOrderGetOrdersOutputSchema,
  WmsOrderItemV2Schema,
  WmsOrderV2Schema,
} from "../../extensions/wms.js";
import {
  CommerceOrderItemSchema,
  CommerceOrderSchema,
  CommerceIdentifierSchema,
  CommerceGetOrdersInputSchema,
  CommerceGetOrdersOutputSchema,
  CommerceAppCapabilitiesSchema,
  CommerceGetAppConfigsOutputSchema,
  CommerceResultSchema,
  CommerceCancelOrderInputSchema,
  CommerceReturnOrderInputSchema,
  CommerceAcceptReturnOrderInputSchema,
  CommerceExchangeOrderInputSchema,
  CommerceGetExchangeableItemsInputSchema,
  CommerceGetExchangeableItemsOutputSchema,
  CommerceChangeShippingAddressInputSchema,
} from "../../extensions/commerce.js";

type GeneratedFile = "common" | "extension";

interface Contract {
  name: string;
  schema: z.ZodTypeAny;
  generatedFile: GeneratedFile;
  protoInterface: string;
  allowMissingProtoKeys?: string[];
}

const contracts: Contract[] = [
  contract("ApiKeyField", ApiKeyFieldSchema, "extension", "ApiKeyField"),
  contract(
    "GetAuthConfigOutput",
    GetAuthConfigOutputSchema,
    "extension",
    "ApiKeyGetAuthConfigOutput"
  ),
  contract(
    "ValidateCredentialsOutput",
    ValidateCredentialsOutputSchema,
    "extension",
    "ApiKeyValidateCredentialsOutput"
  ),

  contract("ConfigCondition", ConfigConditionSchema, "extension", "ConfigCondition"),
  contract("LocalizedConfigText", LocalizedConfigTextSchema, "extension", "ConfigLocalizedText"),
  contract("ConfigChoice", ConfigChoiceSchema, "extension", "ConfigChoice"),
  contract("ConfigInlineLink", ConfigInlineLinkSchema, "extension", "ConfigInlineLink"),
  contract(
    "ConfigValidationNotice",
    ConfigValidationNoticeSchema,
    "extension",
    "ConfigValidationNotice"
  ),
  contract("ConfigHooks", ConfigHooksSchema, "extension", "ConfigHooks"),
  contract(
    "ConfigOAuthAdditionalParam",
    ConfigOAuthAdditionalParamSchema,
    "extension",
    "ConfigOAuthAdditionalParam"
  ),
  contract("ConfigOAuth", ConfigOAuthSchema, "extension", "ConfigOAuth"),
  contract("ConfigChoicesSource", ConfigChoicesSourceSchema, "extension", "ConfigChoicesSource"),
  contract(
    "ConfigDraftResolutionParams",
    ConfigDraftResolutionParamsSchema,
    "extension",
    "ConfigDraftResolutionParams"
  ),
  contract(
    "ConfigResolvedValueTarget",
    ConfigResolvedValueTargetSchema,
    "extension",
    "ConfigResolvedValueTarget"
  ),
  contract("ConfigField", ConfigFieldSchema, "extension", "ConfigField"),
  contract("ConfigBlock", ConfigBlockSchema, "extension", "ConfigBlock"),
  contract(
    "GetConfigSchemaOutput",
    GetConfigSchemaOutputSchema,
    "extension",
    "ConfigGetConfigSchemaOutput"
  ),
  contract(
    "ConfigValidationError",
    ConfigValidationErrorSchema,
    "extension",
    "ConfigValidationError"
  ),
  contract(
    "ValidateStoredConfigOutput",
    ValidateStoredConfigOutputSchema,
    "extension",
    "ConfigValidateStoredConfigOutput"
  ),
  contract(
    "ConfigDraftResolutionOutput",
    ConfigDraftResolutionOutputSchema,
    "extension",
    "ConfigDraftResolutionOutput"
  ),

  contract(
    "OAuthProviderLocalizedText",
    OAuthProviderLocalizedTextSchema,
    "extension",
    "OAuthProviderLocalizedText"
  ),
  contract("OAuthProvider", OAuthProviderSchema, "extension", "OAuthProvider"),
  contract(
    "OAuthTokenRequestMapping",
    OAuthTokenRequestMappingSchema,
    "extension",
    "OAuthTokenRequestMapping"
  ),
  contract(
    "OAuthTokenResponseMapping",
    OAuthTokenResponseMappingSchema,
    "extension",
    "OAuthTokenResponseMapping"
  ),
  contract("OAuthConfig", OAuthConfigSchema, "extension", "OAuthConfig"),
  contract(
    "CredentialValidationInput",
    CredentialValidationInputSchema,
    "extension",
    "OAuthCredentialValidationInput"
  ),
  contract(
    "CredentialValidationResult",
    CredentialValidationResultSchema,
    "extension",
    "OAuthCredentialValidationResult"
  ),

  contract("Calendar", CalendarSchema, "extension", "Calendar"),
  contract("EventType", EventTypeSchema, "extension", "CalendarEventType"),
  contract("TimeSlot", TimeSlotSchema, "extension", "CalendarTimeSlot"),
  contract("Attendee", AttendeeSchema, "extension", "CalendarAttendee"),
  contract("Booking", BookingSchema, "extension", "CalendarBooking"),

  contract("CommandNameI18n", CommandNameI18nSchema, "extension", "CommandNameI18n"),
  contract("CommandNameDescI18n", CommandNameDescI18nSchema, "extension", "CommandNameDescI18n"),
  contract("CommandParamDefI18n", CommandParamDefI18nSchema, "extension", "CommandParamDefI18n"),
  contract("CommandChoice", CommandChoiceSchema, "extension", "CommandChoice"),
  contract(
    "CommandParamDefinition",
    CommandParamDefinitionSchema,
    "extension",
    "CommandParamDefinition"
  ),
  contract("CommandConfig", CommandConfigSchema, "extension", "CommandConfig"),
  contract("GetCommandsOutput", GetCommandsOutputSchema, "extension", "CommandGetCommandsOutput"),
  contract("CommandResult", CommandResultSchema, "extension", "CommandResult"),

  contract("WidgetNameDescI18n", NameDescI18nSchema, "extension", "WidgetNameDescI18n"),
  contract("WidgetConfig", WidgetConfigSchema, "extension", "WidgetConfig"),
  contract("GetWidgetsOutput", GetWidgetsOutputSchema, "extension", "WidgetGetWidgetsOutput"),
  contract("WidgetActionResult", WidgetActionResultSchema, "extension", "WidgetActionResult"),

  contract("CustomTabNameI18n", CustomTabNameI18nSchema, "extension", "CustomTabNameI18n"),
  contract("CustomTabConfig", CustomTabConfigSchema, "extension", "CustomTabConfig"),
  contract(
    "GetCustomTabsOutput",
    GetCustomTabsOutputSchema,
    "extension",
    "CustomTabGetCustomTabsOutput"
  ),
  contract(
    "CustomTabActionResult",
    CustomTabActionResultSchema,
    "extension",
    "CustomTabActionResult"
  ),

  contract("WebhookConfig", WebhookConfigSchema, "extension", "HookWebhookConfig"),
  contract("HookConfig", HookConfigSchema, "extension", "HookConfig"),
  contract("GetHooksOutput", GetHooksOutputSchema, "extension", "HookGetHooksOutput"),

  contract("PollingPoller", PollingPollerSchema, "extension", "PollingPoller"),
  contract("GetPollersOutput", GetPollersOutputSchema, "extension", "PollingGetPollersOutput"),
  contract(
    "GetPollingTargetChannelsInput",
    GetPollingTargetChannelsInputSchema,
    "extension",
    "PollingGetTargetChannelsInput"
  ),
  contract(
    "GetPollingTargetChannelsOutput",
    GetPollingTargetChannelsOutputSchema,
    "extension",
    "PollingGetTargetChannelsOutput"
  ),
  contract("PollingManagerTarget", PollingManagerTargetSchema, "extension", "PollingManagerTarget"),
  contract(
    "GetPollingTargetManagersInput",
    GetPollingTargetManagersInputSchema,
    "extension",
    "PollingGetTargetManagersInput"
  ),
  contract(
    "GetPollingTargetManagersOutput",
    GetPollingTargetManagersOutputSchema,
    "extension",
    "PollingGetTargetManagersOutput"
  ),

  contract("MailRelayHeader", MailRelayHeaderSchema, "extension", "MailRelayHeader"),
  contract(
    "MailRelayCommonHeaders",
    MailRelayCommonHeadersSchema,
    "extension",
    "MailRelayCommonHeaders"
  ),
  contract("MailRelayMail", MailRelayMailSchema, "extension", "MailRelayMail"),
  contract("MailRelayReceipt", MailRelayReceiptSchema, "extension", "MailRelayReceipt"),
  contract(
    "MailRelayInboundInput",
    MailRelayInboundInputSchema,
    "extension",
    "MailRelayInboundInput"
  ),
  contract(
    "MailRelayInboundOutput",
    MailRelayInboundOutputSchema,
    "extension",
    "MailRelayInboundOutput"
  ),

  contract("StoreProfileImage", StoreProfileImageSchema, "extension", "StoreProfileImage"),
  contract("StoreProfileIntro", StoreProfileIntroSchema, "extension", "StoreProfileIntro"),
  contract("StoreFaq", StoreFaqSchema, "extension", "StoreFaq"),
  contract(
    "StoreProfileLocalizedContent",
    StoreProfileLocalizedContentSchema,
    "extension",
    "StoreProfileLocalizedContent"
  ),
  contract(
    "StoreProfileMetadata",
    StoreProfileMetadataSchema,
    "extension",
    "StoreGetProfileOutput"
  ),
  contract("GetStoreProfileInput", GetStoreProfileInputSchema, "extension", "StoreGetProfileInput"),

  contract("DataSourceCatalog", DataSourceCatalogSchema, "extension", "DataSourceCatalog"),
  contract("DataSourceTable", DataSourceTableSchema, "extension", "DataSourceTable"),
  contract("DataSourceColumn", DataSourceColumnSchema, "extension", "DataSourceColumn"),
  contract(
    "DataSourceTableDefinition",
    DataSourceTableDefinitionSchema,
    "extension",
    "DataSourceTableDefinition"
  ),
  contract(
    "DataSourceTableListing",
    DataSourceTableListingSchema,
    "extension",
    "DataSourceTableListing"
  ),
  contract(
    "ListCatalogsInput",
    ListCatalogsInputSchema,
    "extension",
    "DataSourceListCatalogsInput"
  ),
  contract(
    "ListCatalogsOutput",
    ListCatalogsOutputSchema,
    "extension",
    "DataSourceListCatalogsOutput"
  ),
  contract("ListTablesInput", ListTablesInputSchema, "extension", "DataSourceListTablesInput"),
  contract("ListTablesOutput", ListTablesOutputSchema, "extension", "DataSourceListTablesOutput"),
  contract(
    "DescribeTableInput",
    DescribeTableInputSchema,
    "extension",
    "DataSourceDescribeTableInput"
  ),
  contract(
    "DescribeTableOutput",
    DescribeTableOutputSchema,
    "extension",
    "DataSourceDescribeTableOutput"
  ),

  contract("Address", AddressSchema, "extension", "OrderAddress"),
  contract("BankAccount", BankAccountSchema, "extension", "OrderBankAccount"),
  contract("DefectInfo", DefectInfoSchema, "extension", "OrderDefectInfo"),
  contract("ClaimReason", ClaimReasonSchema, "extension", "OrderClaimReason"),
  contract("Claimability", ClaimabilitySchema, "extension", "OrderClaimability"),
  contract("Claim", ClaimSchema, "extension", "OrderClaim"),
  contract("OrderItem", OrderItemSchema, "extension", "OrderItem"),
  contract("OrderClaimItem", OrderClaimItemSchema, "extension", "OrderClaimItem"),
  contract("OrderExchangeItem", OrderExchangeItemSchema, "extension", "OrderExchangeItem"),
  contract("Payment", PaymentSchema, "extension", "OrderPayment"),
  contract("Fulfillment", FulfillmentSchema, "extension", "OrderFulfillment"),
  contract("Order", OrderSchema, "extension", "Order"),
  contract("FieldConfig", FieldConfigSchema, "extension", "OrderFieldConfig"),
  contract("OperationOptions", OperationOptionsSchema, "extension", "OrderOperationOptions"),
  contract("AppCapabilities", AppCapabilitiesSchema, "extension", "OrderAppCapabilities"),

  contract("Buyer", BuyerSchema, "extension", "Buyer"),
  contract("CommerceOrderItem", CommerceOrderItemSchema, "extension", "CommerceOrderItem"),
  contract("CommerceOrder", CommerceOrderSchema, "extension", "CommerceOrder"),
  contract("CommerceIdentifier", CommerceIdentifierSchema, "extension", "CommerceIdentifier"),
  contract(
    "CommerceGetOrdersInput",
    CommerceGetOrdersInputSchema,
    "extension",
    "CommerceGetOrdersInput"
  ),
  contract(
    "CommerceGetOrdersOutput",
    CommerceGetOrdersOutputSchema,
    "extension",
    "CommerceGetOrdersOutput"
  ),
  contract(
    "CommerceAppCapabilities",
    CommerceAppCapabilitiesSchema,
    "extension",
    "CommerceAppCapabilities"
  ),
  contract(
    "CommerceGetAppConfigsOutput",
    CommerceGetAppConfigsOutputSchema,
    "extension",
    "CommerceGetAppConfigsOutput"
  ),
  contract("CommerceActionResult", CommerceResultSchema, "extension", "CommerceActionResult"),
  contract(
    "CommerceCancelOrderInput",
    CommerceCancelOrderInputSchema,
    "extension",
    "CommerceCancelOrderInput"
  ),
  contract(
    "CommerceReturnOrderInput",
    CommerceReturnOrderInputSchema,
    "extension",
    "CommerceReturnOrderInput"
  ),
  contract(
    "CommerceAcceptReturnOrderInput",
    CommerceAcceptReturnOrderInputSchema,
    "extension",
    "CommerceAcceptReturnOrderInput"
  ),
  contract(
    "CommerceExchangeOrderInput",
    CommerceExchangeOrderInputSchema,
    "extension",
    "CommerceExchangeOrderInput"
  ),
  contract(
    "CommerceGetExchangeableItemsInput",
    CommerceGetExchangeableItemsInputSchema,
    "extension",
    "CommerceGetExchangeableItemsInput"
  ),
  contract(
    "CommerceGetExchangeableItemsOutput",
    CommerceGetExchangeableItemsOutputSchema,
    "extension",
    "CommerceGetExchangeableItemsOutput"
  ),
  contract(
    "CommerceChangeShippingAddressInput",
    CommerceChangeShippingAddressInputSchema,
    "extension",
    "CommerceChangeShippingAddressInput"
  ),
  contract("WmsShippingInfo", WmsShippingInfoSchema, "extension", "WmsShippingInfo"),
  contract("WmsDelivery", WmsDeliverySchema, "extension", "WmsDelivery"),
  contract("WmsOrderItem", WmsOrderItemSchema, "extension", "WmsOrderItem"),
  contract("WmsOrder", WmsOrderSchema, "extension", "WmsOrder"),
  contract("WmsDeliveryV2", WmsDeliveryV2Schema, "extension", "WmsDeliveryV2"),
  contract("WmsOrderItemV2", WmsOrderItemV2Schema, "extension", "WmsOrderItemV2"),
  contract("WmsOrderV2", WmsOrderV2Schema, "extension", "WmsOrderV2"),
  contract("WmsIdentifier", WmsIdentifierSchema, "extension", "WmsIdentifier"),
  contract(
    "WmsOrderGetOrdersInput",
    WmsOrderGetOrdersInputSchema,
    "extension",
    "WmsOrderGetOrdersRequest"
  ),
  contract(
    "WmsOrderGetOrdersOutput",
    WmsOrderGetOrdersOutputSchema,
    "extension",
    "WmsOrderGetOrdersResult"
  ),
  contract("WmsOrderActionInput", WmsOrderActionInputSchema, "extension", "WmsOrderActionRequest"),
  contract("WmsOrderActionOutput", WmsOrderActionOutputSchema, "extension", "WmsOrderActionResult"),
  contract(
    "WmsOrderChangeShippingAddressInput",
    WmsOrderChangeShippingAddressInputSchema,
    "extension",
    "WmsOrderChangeShippingAddressInput"
  ),
  contract(
    "WmsGetAppConfigsInput",
    WmsGetAppConfigsInputSchema,
    "extension",
    "WmsGetAppConfigsInput"
  ),
  contract(
    "WmsGetAppConfigsOutput",
    WmsGetAppConfigsOutputSchema,
    "extension",
    "WmsGetAppConfigsOutput"
  ),
  contract("WmsAppCapabilities", WmsAppCapabilitiesSchema, "extension", "WmsAppCapabilities"),
  contract("WmsOperationOptions", WmsOperationOptionsSchema, "extension", "WmsOperationOptions"),
  contract("GetWmsOrdersInput", GetWmsOrdersInputSchema, "extension", "WmsGetOrdersRequest"),
  contract("GetWmsOrdersOutput", GetWmsOrdersOutputSchema, "extension", "WmsGetOrdersResult"),
  contract("GetWmsOrderInput", GetWmsOrderInputSchema, "extension", "WmsGetOrderRequest"),
  contract("GetWmsOrderOutput", GetWmsOrderOutputSchema, "extension", "WmsGetOrderResult"),
  contract("GetWmsShopIdInput", GetWmsShopIdInputSchema, "extension", "WmsGetShopIDRequest"),
  contract("GetWmsShopIdOutput", GetWmsShopIdOutputSchema, "extension", "WmsGetShopIDResult"),
  contract(
    "GetWmsSupportedCommercesInput",
    GetWmsSupportedCommercesInputSchema,
    "extension",
    "WmsGetSupportedCommercesRequest"
  ),
  contract(
    "GetWmsSupportedCommercesOutput",
    GetWmsSupportedCommercesOutputSchema,
    "extension",
    "WmsGetSupportedCommercesResult"
  ),
  contract("CancelWmsOrderInput", CancelWmsOrderInputSchema, "extension", "WmsOrderStateRequest", [
    "memo",
  ]),
  contract("ReturnWmsOrderInput", ReturnWmsOrderInputSchema, "extension", "WmsOrderStateRequest"),
  contract(
    "ExchangeWmsOrderInput",
    ExchangeWmsOrderInputSchema,
    "extension",
    "WmsOrderStateRequest"
  ),
  contract(
    "ChangeWmsShippingAddressInput",
    ChangeWmsShippingAddressInputSchema,
    "extension",
    "WmsChangeShippingAddressRequest"
  ),
  contract(
    "RestoreWmsOrderInput",
    RestoreWmsOrderInputSchema,
    "extension",
    "WmsRestoreOrderRequest"
  ),
  contract("WmsSuccessOutput", WmsSuccessOutputSchema, "extension", "WmsSuccessResult"),

  contract("MessagingAlf", MessagingAlfSchema, "common", "Alf"),
  contract("MessagingMeet", MessagingMeetSchema, "common", "Meet"),
  contract("MessagingMessageFile", MessagingMessageFileSchema, "common", "MessageFile"),
  contract("MessagingMessageThread", MessagingMessageThreadSchema, "common", "MessageThread"),
  contract("MessagingMessageButton", MessagingMessageButtonSchema, "common", "MessageButton"),
  contract("MessagingCustomPayload", MessagingCustomPayloadSchema, "common", "CustomPayload"),
  contract("MessagingMessage", MessagingMessageSchema, "common", "ChannelMessage", ["errorCode"]),
  contract("MessagingPrebuiltMessage", MessagingPrebuiltMessageSchema, "common", "PrebuiltMessage"),
  contract("MessagingUserChat", MessagingUserChatSchema, "common", "ChannelUserChat"),
  contract("MessagingUser", MessagingUserSchema, "common", "ChannelUser"),
  contract("MessagingWamResult", MessagingWamResultSchema, "common", "WamResult"),
  contract(
    "MessagingUnavailableReason",
    MessagingUnavailableReasonSchema,
    "common",
    "UnavailableReason"
  ),
  contract(
    "MessagingWritingTypeState",
    MessagingWritingTypeStateSchema,
    "common",
    "WritingTypeState"
  ),
  contract("MessagingWritingTypeMap", MessagingWritingTypeMapSchema, "common", "WritingTypeMap"),
  contract("MessagingMediumProfile", MessagingMediumProfileSchema, "common", "MediumProfile"),
  contract(
    "OnMediumMessageCreatedInput",
    OnMediumMessageCreatedInputSchema,
    "extension",
    "MessagingOnMediumMessageCreatedInput"
  ),
  contract(
    "OnMediumMessageCreatedOutput",
    OnMediumMessageCreatedOutputSchema,
    "extension",
    "MessagingOnMediumMessageCreatedOutput"
  ),
  contract(
    "InboxOnMediumUserChatClosedInput",
    InboxOnMediumUserChatClosedInputSchema,
    "extension",
    "MessagingInboxOnMediumUserChatClosedInput"
  ),
  contract(
    "InboxOnMediumUserChatClosedOutput",
    InboxOnMediumUserChatClosedOutputSchema,
    "extension",
    "MessagingInboxOnMediumUserChatClosedOutput"
  ),
  contract(
    "InboxGetWritingTypesInput",
    InboxGetWritingTypesInputSchema,
    "extension",
    "MessagingInboxGetWritingTypesInput"
  ),
  contract(
    "InboxGetWritingTypesOutput",
    InboxGetWritingTypesOutputSchema,
    "extension",
    "MessagingInboxGetWritingTypesOutput"
  ),
  contract(
    "InboxGetCustomEditorWamInput",
    InboxGetCustomEditorWamInputSchema,
    "extension",
    "MessagingInboxGetCustomEditorWamInput"
  ),
  contract(
    "InboxGetMediumTopicSelectorWamInput",
    InboxGetMediumTopicSelectorWamInputSchema,
    "extension",
    "MessagingInboxGetMediumTopicSelectorWamInput"
  ),
  contract(
    "InboxGetMediumMessageErrorReasonInput",
    InboxGetMediumMessageErrorReasonInputSchema,
    "extension",
    "MessagingInboxGetMediumMessageErrorReasonInput"
  ),
  contract(
    "InboxGetMediumMessageErrorReasonOutput",
    InboxGetMediumMessageErrorReasonOutputSchema,
    "extension",
    "MessagingInboxGetMediumMessageErrorReasonOutput"
  ),
  contract(
    "PrebuiltGetWritingTypesInput",
    PrebuiltGetWritingTypesInputSchema,
    "extension",
    "MessagingPrebuiltGetWritingTypesInput"
  ),
  contract(
    "PrebuiltGetWritingTypesOutput",
    PrebuiltGetWritingTypesOutputSchema,
    "extension",
    "MessagingPrebuiltGetWritingTypesOutput"
  ),
  contract(
    "PrebuiltValidateEntityInput",
    PrebuiltValidateEntityInputSchema,
    "extension",
    "MessagingPrebuiltValidateEntityInput"
  ),
  contract(
    "PrebuiltValidateEntityOutput",
    PrebuiltValidateEntityOutputSchema,
    "extension",
    "MessagingPrebuiltValidateEntityOutput"
  ),
  contract(
    "PrebuiltGetCustomEditorWamInput",
    PrebuiltGetCustomEditorWamInputSchema,
    "extension",
    "MessagingPrebuiltGetCustomEditorWamInput"
  ),
  contract(
    "PrebuiltGetMediumTopicBuilderSelectorWamInput",
    PrebuiltGetMediumTopicBuilderSelectorWamInputSchema,
    "extension",
    "MessagingPrebuiltGetMediumTopicBuilderSelectorWamInput"
  ),
  contract(
    "PrebuiltBuildMediumTopicsInput",
    PrebuiltBuildMediumTopicsInputSchema,
    "extension",
    "MessagingPrebuiltBuildMediumTopicsInput"
  ),
  contract(
    "PrebuiltBuildMediumTopicsOutput",
    PrebuiltBuildMediumTopicsOutputSchema,
    "extension",
    "MessagingPrebuiltBuildMediumTopicsOutput"
  ),
  contract(
    "PrebuiltGetDefaultOptionsInput",
    PrebuiltGetDefaultOptionsInputSchema,
    "extension",
    "MessagingPrebuiltGetDefaultOptionsInput"
  ),
  contract(
    "PrebuiltGetDefaultOptionsOutput",
    PrebuiltGetDefaultOptionsOutputSchema,
    "extension",
    "MessagingPrebuiltGetDefaultOptionsOutput"
  ),

  contract("MemoryDefinition", MemoryDefinitionSchema, "extension", "AlfTaskMemoryDefinition"),
  contract("WorkflowNode", WorkflowNodeSchema, "extension", "AlfTaskWorkflowNode"),
  contract("PredefinedTask", PredefinedTaskSchema, "extension", "AlfTaskPredefinedTask"),
  contract("GetAlfTasksInput", GetAlfTasksInputSchema, "extension", "AlfTaskGetTasksInput"),
  contract("GetAlfTasksResponse", GetAlfTasksResponseSchema, "extension", "AlfTaskGetTasksOutput"),
  contract("NotebookCell", NotebookCellSchema, "extension", "NotebookCell"),
  contract("NotebookLayoutColumn", NotebookLayoutColumnSchema, "extension", "NotebookLayoutColumn"),
  contract("NotebookLayoutRow", NotebookLayoutRowSchema, "extension", "NotebookLayoutRow"),
  contract("NotebookTab", NotebookTabSchema, "extension", "NotebookTab"),
  contract("NotebookPayload", NotebookPayloadSchema, "extension", "NotebookPayload"),
  contract("AppNotebook", AppNotebookSchema, "extension", "AppNotebook"),
  contract("GetNotebooksInput", GetNotebooksInputSchema, "extension", "NotebookGetNotebooksInput"),
  contract(
    "GetNotebooksResponse",
    GetNotebooksResponseSchema,
    "extension",
    "NotebookGetNotebooksOutput"
  ),
];

const __dirname = dirname(fileURLToPath(import.meta.url));
const generatedSources: Record<GeneratedFile, string> = {
  common: readFileSync(resolve(__dirname, "../../gen/channel/app/sdk/v1/common.ts"), "utf8"),
  extension: readFileSync(resolve(__dirname, "../../gen/channel/app/sdk/v1/extension.ts"), "utf8"),
};

describe("extension zod schemas and generated proto fields", () => {
  it.each(contracts)("$name declares only proto-owned fields", (entry) => {
    const zodKeys = schemaKeys(entry.schema);
    const protoKeys = generatedInterfaceKeys(
      generatedSources[entry.generatedFile],
      entry.protoInterface
    );
    const allowedMissing = new Set(entry.allowMissingProtoKeys ?? []);
    const unknownZodKeys = [...zodKeys].filter((key) => !protoKeys.has(key));
    const missingZodKeys = [...protoKeys].filter(
      (key) => !zodKeys.has(key) && !allowedMissing.has(key) && !schemaPassesThrough(entry.schema)
    );

    expect(unknownZodKeys, `${entry.name} has fields not declared by proto`).toEqual([]);
    expect(missingZodKeys, `${entry.name} strips proto fields`).toEqual([]);
  });
});

function contract(
  name: string,
  schema: z.ZodTypeAny,
  generatedFile: GeneratedFile,
  protoInterface: string,
  allowMissingProtoKeys?: string[]
): Contract {
  return { name, schema, generatedFile, protoInterface, allowMissingProtoKeys };
}

function generatedInterfaceKeys(source: string, interfaceName: string): Set<string> {
  const match = new RegExp(`export interface ${interfaceName} \\{([\\s\\S]*?)\\n\\}`).exec(source);
  if (!match) {
    throw new Error(`Missing generated proto interface: ${interfaceName}`);
  }

  const keys = new Set<string>();
  for (const propertyMatch of match[1].matchAll(
    /^\s+((?:"[^"]+")|(?:'[^']+')|[A-Za-z_$][\w$]*)\??\s*:/gm
  )) {
    const rawKey = propertyMatch[1];
    if (!rawKey) {
      continue;
    }
    keys.add(rawKey.replace(/^["']|["']$/g, ""));
  }
  return keys;
}

function schemaKeys(schema: z.ZodTypeAny): Set<string> {
  const unwrapped = unwrapSchema(schema);
  if (unwrapped instanceof z.ZodObject) {
    return new Set(Object.keys(unwrapped.shape));
  }
  if (unwrapped instanceof z.ZodDiscriminatedUnion) {
    return unionKeys(discriminatedUnionOptions(unwrapped));
  }
  if (unwrapped instanceof z.ZodUnion) {
    return unionKeys(unwrapped.options);
  }
  throw new Error(`Expected an object-like Zod schema, got ${unwrapped._def.typeName}`);
}

function unionKeys(options: z.ZodTypeAny[]): Set<string> {
  const keys = new Set<string>();
  for (const option of options) {
    for (const key of schemaKeys(option)) {
      keys.add(key);
    }
  }
  return keys;
}

function schemaPassesThrough(schema: z.ZodTypeAny): boolean {
  const unwrapped = unwrapSchema(schema);
  if (unwrapped instanceof z.ZodObject) {
    return unwrapped._def.unknownKeys === "passthrough";
  }
  if (unwrapped instanceof z.ZodDiscriminatedUnion) {
    return discriminatedUnionOptions(unwrapped).some(schemaPassesThrough);
  }
  if (unwrapped instanceof z.ZodUnion) {
    return unwrapped.options.some(schemaPassesThrough);
  }
  return false;
}

function discriminatedUnionOptions(
  schema: z.ZodDiscriminatedUnion<string, z.ZodObject[]>
): z.ZodTypeAny[] {
  return [...schema.optionsMap.values()];
}

function unwrapSchema(schema: z.ZodTypeAny): z.ZodTypeAny {
  let current = schema;
  while (
    current instanceof z.ZodEffects ||
    current instanceof z.ZodOptional ||
    current instanceof z.ZodNullable ||
    current instanceof z.ZodDefault
  ) {
    if (current instanceof z.ZodEffects) {
      current = current.innerType();
      continue;
    }
    current = current._def.innerType;
  }
  return current;
}
