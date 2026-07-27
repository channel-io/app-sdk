/* eslint-disable @typescript-eslint/no-deprecated -- The canonical registry must include the deprecated API key compatibility extension. */
import { z } from "zod";
import { GetAlfTasksResponseSchema } from "./alftask.js";
import { GetAuthConfigOutputSchema, ValidateCredentialsOutputSchema } from "./apikey.js";
import {
  AttendeeSchema,
  BookingSchema,
  CalendarSchema,
  EventTypeSchema,
  TimeSlotSchema,
} from "./calendar.js";
import { CommandChoiceSchema, CommandConfigSchema, CommandResultSchema } from "./command.js";
import { GetConfigSchemaOutputSchema, ValidateStoredConfigOutputSchema } from "./config.js";
import { CustomTabActionResultSchema, GetCustomTabsOutputSchema } from "./customtab.js";
import {
  DescribeTableInputSchema,
  DescribeTableOutputSchema,
  ListCatalogsInputSchema,
  ListCatalogsOutputSchema,
  ListTablesInputSchema,
  ListTablesOutputSchema,
} from "./datasource.js";
import { GetHooksOutputSchema } from "./hook.js";
import {
  InboxGetCustomEditorWamInputSchema,
  InboxGetCustomEditorWamOutputSchema,
  InboxGetMediumMessageErrorReasonInputSchema,
  InboxGetMediumMessageErrorReasonOutputSchema,
  InboxGetMediumTopicSelectorWamInputSchema,
  InboxGetMediumTopicSelectorWamOutputSchema,
  InboxGetWritingTypesInputSchema,
  InboxGetWritingTypesOutputSchema,
  InboxOnMediumUserChatClosedInputSchema,
  InboxOnMediumUserChatClosedOutputSchema,
  OnMediumMessageCreatedInputSchema,
  OnMediumMessageCreatedOutputSchema,
  PrebuiltBuildMediumTopicsInputSchema,
  PrebuiltBuildMediumTopicsOutputSchema,
  PrebuiltGetCustomEditorWamInputSchema,
  PrebuiltGetCustomEditorWamOutputSchema,
  PrebuiltGetDefaultOptionsInputSchema,
  PrebuiltGetDefaultOptionsOutputSchema,
  PrebuiltGetMediumTopicBuilderSelectorWamInputSchema,
  PrebuiltGetMediumTopicBuilderSelectorWamOutputSchema,
  PrebuiltGetWritingTypesInputSchema,
  PrebuiltGetWritingTypesOutputSchema,
  PrebuiltValidateEntityInputSchema,
  PrebuiltValidateEntityOutputSchema,
} from "./messaging.js";
import { MailRelayInboundInputSchema, MailRelayInboundOutputSchema } from "./mail-relay.js";
import { GetNotebooksResponseSchema } from "./notebook.js";
import {
  CredentialValidationInputSchema,
  CredentialValidationResultSchema,
  OAuthConfigSchema,
} from "./oauth.js";
import {
  AddressSchema,
  AppCapabilitiesSchema,
  BankAccountSchema,
  ClaimReasonSchema,
  DefectInfoSchema,
  OrderClaimItemSchema,
  OrderExchangeItemSchema,
  OrderItemSchema,
  OrderSchema,
} from "./order.js";
import {
  CommerceCancelOrderInputSchema,
  CommerceChangeShippingAddressInputSchema,
  CommerceExchangeOrderInputSchema,
  CommerceGetAppConfigsOutputSchema,
  CommerceGetExchangeableItemsInputSchema,
  CommerceGetExchangeableItemsOutputSchema,
  CommerceGetOrdersInputSchema,
  CommerceGetOrdersOutputSchema,
  CommerceResultSchema,
  CommerceAcceptReturnOrderInputSchema,
  CommerceReturnOrderInputSchema,
} from "./commerce.js";
import {
  GetPollersOutputSchema,
  GetPollingTargetChannelsInputSchema,
  GetPollingTargetChannelsOutputSchema,
} from "./polling.js";
import { GetStoreProfileInputSchema, GetStoreProfileOutputSchema } from "./store.js";
import { WidgetActionResultSchema, GetWidgetsOutputSchema } from "./widget.js";
import {
  CancelWmsOrderInputSchema,
  ChangeWmsShippingAddressInputSchema,
  ExchangeWmsOrderInputSchema,
  GetWmsOrderInputSchema,
  GetWmsOrderOutputSchema,
  GetWmsOrdersInputSchema,
  GetWmsOrdersOutputSchema,
  GetWmsShopIdInputSchema,
  GetWmsShopIdOutputSchema,
  GetWmsSupportedCommercesInputSchema,
  GetWmsSupportedCommercesOutputSchema,
  RestoreWmsOrderInputSchema,
  ReturnWmsOrderInputSchema,
  WmsGetAppConfigsInputSchema,
  WmsGetAppConfigsOutputSchema,
  WmsOrderActionInputSchema,
  WmsOrderActionOutputSchema,
  WmsOrderChangeShippingAddressInputSchema,
  WmsOrderGetOrdersInputSchema,
  WmsOrderGetOrdersOutputSchema,
  WmsSuccessOutputSchema,
} from "./wms.js";
import { zodToJsonSchema } from "../utils/zod-to-json-schema.js";
import type { FunctionSchema } from "../types/function.js";

const EmptyInputSchema = z.object({});
const JsonObjectSchema = z.object({}).passthrough();
const JsonValueSchema = z.unknown();

const AlfTaskGetTasksInputSchema = z.object({
  version: z.string().optional(),
});

const ExtensionChatSchema = z.object({
  type: z.string().optional(),
  id: z.string().optional(),
});

const CalendarListCalendarsInputSchema = z.object({
  pageToken: z.string().optional(),
});

const CalendarListCalendarsOutputSchema = z.object({
  calendars: z.array(CalendarSchema),
  nextPageToken: z.string().optional(),
});

const CalendarListEventTypesInputSchema = z.object({
  calendarId: z.string().optional(),
});

const CalendarListEventTypesOutputSchema = z.object({
  eventTypes: z.array(EventTypeSchema),
});

const CalendarGetAvailabilityInputSchema = z.object({
  eventTypeId: z.string(),
  startDate: z.string(),
  endDate: z.string(),
  timezone: z.string().optional(),
});

const CalendarGetAvailabilityOutputSchema = z.object({
  slots: z.array(TimeSlotSchema),
});

const CalendarCreateBookingInputSchema = z.object({
  eventTypeId: z.string(),
  startTime: z.string(),
  attendee: AttendeeSchema,
  notes: z.string().optional(),
  timezone: z.string().optional(),
});

const CalendarCancelBookingInputSchema = z.object({
  bookingId: z.string(),
  reason: z.string().optional(),
});

const CalendarCancelBookingOutputSchema = z.object({
  success: z.boolean(),
  booking: BookingSchema.optional(),
});

const CalendarGetBookingInputSchema = z.object({
  bookingId: z.string(),
});

const CommandAutoCompleteArgumentSchema = z.object({
  focused: z.boolean().optional(),
  name: z.string().optional(),
  value: JsonValueSchema.optional(),
});

const CommandTriggerSchema = z.object({
  type: z.string().optional(),
  attributes: z.record(z.string()).optional(),
});

const CommandGetSuggestionsInputSchema = z.object({
  chat: ExtensionChatSchema.optional(),
  input: z.array(CommandAutoCompleteArgumentSchema).optional(),
  language: z.string().optional(),
});

const CommandGetSuggestionsOutputSchema = z.object({
  choices: z.array(CommandChoiceSchema),
});

const CommandExecuteInputSchema = z.object({
  chat: ExtensionChatSchema.optional(),
  trigger: CommandTriggerSchema.optional(),
  input: JsonObjectSchema.optional(),
  language: z.string().optional(),
});

const WidgetActionInputSchema = z.object({
  chat: ExtensionChatSchema.optional(),
  language: z.string().optional(),
});

const CustomTabActionInputSchema = z.object({
  language: z.string().optional(),
  wamArgs: JsonValueSchema.optional(),
});

const OrderGetOrdersInputSchema = z.object({
  identifierType: z.string().optional(),
  identifierValue: z.string().optional(),
});

const OrderGetOrdersOutputSchema = z.object({
  orders: z.array(OrderSchema).optional(),
});

const OrderGetAppConfigsOutputSchema = z.object({
  appCapabilities: AppCapabilitiesSchema.optional(),
});

const OrderCancelOrderInputSchema = z.object({
  orderId: z.string().optional(),
  cancelItems: z.array(OrderClaimItemSchema).optional(),
  reason: ClaimReasonSchema.optional(),
  refundBankAccount: BankAccountSchema.optional(),
});

const OrderReturnOrderInputSchema = z.object({
  orderId: z.string().optional(),
  returnItems: z.array(OrderClaimItemSchema).optional(),
  reason: ClaimReasonSchema.optional(),
  requestPickup: z.boolean().optional(),
  pickupAddress: AddressSchema.optional(),
  refundBankAccount: BankAccountSchema.optional(),
  trackingNumber: z.string().optional(),
  trackingCompany: z.string().optional(),
  defectInfo: DefectInfoSchema.optional(),
  shippingFeePaymentType: z.string().optional(),
});

const OrderExchangeOrderInputSchema = z.object({
  orderId: z.string().optional(),
  beforeExchangeItems: z.array(OrderClaimItemSchema).optional(),
  afterExchangeItems: z.array(OrderExchangeItemSchema).optional(),
  reason: ClaimReasonSchema.optional(),
  requestPickup: z.boolean().optional(),
  pickupAddress: AddressSchema.optional(),
  refundBankAccount: BankAccountSchema.optional(),
  defectInfo: DefectInfoSchema.optional(),
  shippingFeePaymentType: z.string().optional(),
});

const OrderGetExchangeableItemsInputSchema = z.object({
  orderId: z.string().optional(),
  items: z.array(OrderClaimItemSchema).optional(),
});

const OrderGetExchangeableItemsOutputSchema = z.object({
  items: z.array(OrderItemSchema).optional(),
});

const OrderChangeShippingAddressInputSchema = z.object({
  orderId: z.string().optional(),
  newAddress: AddressSchema.optional(),
});

const OrderSuccessOutputSchema = z.object({
  success: z.boolean().optional(),
});

interface FunctionSchemaDefinition {
  name: string;
  input: z.ZodType;
  output: z.ZodType;
}

export const extensionFunctionSchemaDefinitions: FunctionSchemaDefinition[] = [
  {
    name: "extension.alfTask.alftask.getTasks",
    input: AlfTaskGetTasksInputSchema,
    output: GetAlfTasksResponseSchema,
  },
  {
    name: "extension.apikey.metadata.getAuthConfig",
    input: EmptyInputSchema,
    output: GetAuthConfigOutputSchema,
  },
  {
    name: "extension.apikey.validation.validateCredentials",
    input: EmptyInputSchema,
    output: ValidateCredentialsOutputSchema,
  },
  {
    name: "extension.calendar.booking.cancelBooking",
    input: CalendarCancelBookingInputSchema,
    output: CalendarCancelBookingOutputSchema,
  },
  {
    name: "extension.calendar.booking.createBooking",
    input: CalendarCreateBookingInputSchema,
    output: BookingSchema,
  },
  {
    name: "extension.calendar.bookingQuery.getBooking",
    input: CalendarGetBookingInputSchema,
    output: BookingSchema,
  },
  {
    name: "extension.calendar.calendar.getAvailability",
    input: CalendarGetAvailabilityInputSchema,
    output: CalendarGetAvailabilityOutputSchema,
  },
  {
    name: "extension.calendar.calendar.listCalendars",
    input: CalendarListCalendarsInputSchema,
    output: CalendarListCalendarsOutputSchema,
  },
  {
    name: "extension.calendar.calendar.listEventTypes",
    input: CalendarListEventTypesInputSchema,
    output: CalendarListEventTypesOutputSchema,
  },
  {
    name: "extension.command.command.execute",
    input: CommandExecuteInputSchema,
    output: CommandResultSchema,
  },
  {
    name: "extension.command.command.getSuggestions",
    input: CommandGetSuggestionsInputSchema,
    output: CommandGetSuggestionsOutputSchema,
  },
  {
    name: "extension.command.metadata.getCommands",
    input: EmptyInputSchema,
    output: z.object({ commands: z.array(CommandConfigSchema).max(30) }),
  },
  {
    name: "extension.commerce.core.getAppConfigs",
    input: EmptyInputSchema,
    output: CommerceGetAppConfigsOutputSchema,
  },
  {
    name: "extension.commerce.order.acceptReturnOrder",
    input: CommerceAcceptReturnOrderInputSchema,
    output: CommerceResultSchema,
  },
  {
    name: "extension.commerce.order.changeShippingAddress",
    input: CommerceChangeShippingAddressInputSchema,
    output: CommerceResultSchema,
  },
  {
    name: "extension.commerce.order.getExchangeableItems",
    input: CommerceGetExchangeableItemsInputSchema,
    output: CommerceGetExchangeableItemsOutputSchema,
  },
  {
    name: "extension.commerce.order.getOrders",
    input: CommerceGetOrdersInputSchema,
    output: CommerceGetOrdersOutputSchema,
  },
  {
    name: "extension.commerce.order.requestCancelOrder",
    input: CommerceCancelOrderInputSchema,
    output: CommerceResultSchema,
  },
  {
    name: "extension.commerce.order.requestExchangeOrder",
    input: CommerceExchangeOrderInputSchema,
    output: CommerceResultSchema,
  },
  {
    name: "extension.commerce.order.requestReturnOrder",
    input: CommerceReturnOrderInputSchema,
    output: CommerceResultSchema,
  },
  {
    name: "extension.config.metadata.getConfigSchema",
    input: EmptyInputSchema,
    output: GetConfigSchemaOutputSchema,
  },
  {
    name: "extension.config.validation.validateStoredConfig",
    input: EmptyInputSchema,
    output: ValidateStoredConfigOutputSchema,
  },
  {
    name: "extension.customtab.customtab.action",
    input: CustomTabActionInputSchema,
    output: CustomTabActionResultSchema,
  },
  {
    name: "extension.customtab.metadata.getCustomTabs",
    input: EmptyInputSchema,
    output: GetCustomTabsOutputSchema,
  },
  {
    name: "extension.datasource.catalog.describeTable",
    input: DescribeTableInputSchema,
    output: DescribeTableOutputSchema,
  },
  {
    name: "extension.datasource.catalog.listCatalogs",
    input: ListCatalogsInputSchema,
    output: ListCatalogsOutputSchema,
  },
  {
    name: "extension.datasource.catalog.listTables",
    input: ListTablesInputSchema,
    output: ListTablesOutputSchema,
  },
  {
    name: "extension.hook.metadata.getHooks",
    input: EmptyInputSchema,
    output: GetHooksOutputSchema,
  },
  {
    name: "extension.mailRelay.inbound.onMailReceived",
    input: MailRelayInboundInputSchema,
    output: MailRelayInboundOutputSchema,
  },
  {
    name: "extension.messaging.inbox.getCustomEditorWam",
    input: InboxGetCustomEditorWamInputSchema,
    output: InboxGetCustomEditorWamOutputSchema,
  },
  {
    name: "extension.messaging.inbox.getMediumMessageErrorReason",
    input: InboxGetMediumMessageErrorReasonInputSchema,
    output: InboxGetMediumMessageErrorReasonOutputSchema,
  },
  {
    name: "extension.messaging.inbox.getMediumTopicSelectorWam",
    input: InboxGetMediumTopicSelectorWamInputSchema,
    output: InboxGetMediumTopicSelectorWamOutputSchema,
  },
  {
    name: "extension.messaging.inbox.getWritingTypes",
    input: InboxGetWritingTypesInputSchema,
    output: InboxGetWritingTypesOutputSchema,
  },
  {
    name: "extension.messaging.inbox.onMediumMessageCreated",
    input: OnMediumMessageCreatedInputSchema,
    output: OnMediumMessageCreatedOutputSchema,
  },
  {
    name: "extension.messaging.inbox.onMediumUserChatClosed",
    input: InboxOnMediumUserChatClosedInputSchema,
    output: InboxOnMediumUserChatClosedOutputSchema,
  },
  {
    name: "extension.messaging.prebuilt.buildMediumTopics",
    input: PrebuiltBuildMediumTopicsInputSchema,
    output: PrebuiltBuildMediumTopicsOutputSchema,
  },
  {
    name: "extension.messaging.prebuilt.getCustomEditorWam",
    input: PrebuiltGetCustomEditorWamInputSchema,
    output: PrebuiltGetCustomEditorWamOutputSchema,
  },
  {
    name: "extension.messaging.prebuilt.getDefaultOptions",
    input: PrebuiltGetDefaultOptionsInputSchema,
    output: PrebuiltGetDefaultOptionsOutputSchema,
  },
  {
    name: "extension.messaging.prebuilt.getMediumTopicBuilderSelectorWam",
    input: PrebuiltGetMediumTopicBuilderSelectorWamInputSchema,
    output: PrebuiltGetMediumTopicBuilderSelectorWamOutputSchema,
  },
  {
    name: "extension.messaging.prebuilt.getWritingTypes",
    input: PrebuiltGetWritingTypesInputSchema,
    output: PrebuiltGetWritingTypesOutputSchema,
  },
  {
    name: "extension.messaging.prebuilt.validateEntity",
    input: PrebuiltValidateEntityInputSchema,
    output: PrebuiltValidateEntityOutputSchema,
  },
  {
    name: "extension.notebook.core.getNotebooks",
    input: EmptyInputSchema,
    output: GetNotebooksResponseSchema,
  },
  {
    name: "extension.oauth.metadata.getAuthConfig",
    input: EmptyInputSchema,
    output: OAuthConfigSchema,
  },
  {
    name: "extension.oauth.validation.validateCredentials",
    input: CredentialValidationInputSchema,
    output: CredentialValidationResultSchema,
  },
  {
    name: "extension.order.cancel.cancelOrder",
    input: OrderCancelOrderInputSchema,
    output: OrderSuccessOutputSchema,
  },
  {
    name: "extension.order.core.getAppConfigs",
    input: EmptyInputSchema,
    output: OrderGetAppConfigsOutputSchema,
  },
  {
    name: "extension.order.core.getOrders",
    input: OrderGetOrdersInputSchema,
    output: OrderGetOrdersOutputSchema,
  },
  {
    name: "extension.order.edit.changeShippingAddress",
    input: OrderChangeShippingAddressInputSchema,
    output: OrderSuccessOutputSchema,
  },
  {
    name: "extension.order.exchange.exchangeOrder",
    input: OrderExchangeOrderInputSchema,
    output: OrderSuccessOutputSchema,
  },
  {
    name: "extension.order.exchange.getExchangeableItems",
    input: OrderGetExchangeableItemsInputSchema,
    output: OrderGetExchangeableItemsOutputSchema,
  },
  {
    name: "extension.order.return.returnOrder",
    input: OrderReturnOrderInputSchema,
    output: OrderSuccessOutputSchema,
  },
  {
    name: "extension.polling.metadata.getPollers",
    input: EmptyInputSchema,
    output: GetPollersOutputSchema,
  },
  {
    name: "extension.polling.target.getChannels",
    input: GetPollingTargetChannelsInputSchema,
    output: GetPollingTargetChannelsOutputSchema,
  },
  {
    name: "extension.store.metadata.getStoreProfile",
    input: GetStoreProfileInputSchema,
    output: GetStoreProfileOutputSchema,
  },
  {
    name: "extension.widget.metadata.getWidgets",
    input: EmptyInputSchema,
    output: GetWidgetsOutputSchema,
  },
  {
    name: "extension.widget.widget.action",
    input: WidgetActionInputSchema,
    output: WidgetActionResultSchema,
  },
  {
    name: "extension.wms.cancel.cancelOrder",
    input: CancelWmsOrderInputSchema,
    output: WmsSuccessOutputSchema,
  },
  {
    name: "extension.wms.cancel.restoreOrder",
    input: RestoreWmsOrderInputSchema,
    output: WmsSuccessOutputSchema,
  },
  {
    name: "extension.wms.core.getAppConfigs",
    input: WmsGetAppConfigsInputSchema,
    output: WmsGetAppConfigsOutputSchema,
  },
  {
    name: "extension.wms.core.getOrder",
    input: GetWmsOrderInputSchema,
    output: GetWmsOrderOutputSchema,
  },
  {
    name: "extension.wms.core.getOrders",
    input: GetWmsOrdersInputSchema,
    output: GetWmsOrdersOutputSchema,
  },
  {
    name: "extension.wms.core.getShopId",
    input: GetWmsShopIdInputSchema,
    output: GetWmsShopIdOutputSchema,
  },
  {
    name: "extension.wms.edit.changeShippingAddress",
    input: ChangeWmsShippingAddressInputSchema,
    output: WmsSuccessOutputSchema,
  },
  {
    name: "extension.wms.exchange.exchangeOrder",
    input: ExchangeWmsOrderInputSchema,
    output: WmsSuccessOutputSchema,
  },
  {
    name: "extension.wms.exchange.restoreOrder",
    input: RestoreWmsOrderInputSchema,
    output: WmsSuccessOutputSchema,
  },
  {
    name: "extension.wms.metadata.getSupportedCommerces",
    input: GetWmsSupportedCommercesInputSchema,
    output: GetWmsSupportedCommercesOutputSchema,
  },
  {
    name: "extension.wms.order.changeShippingAddress",
    input: WmsOrderChangeShippingAddressInputSchema,
    output: WmsOrderActionOutputSchema,
  },
  {
    name: "extension.wms.order.getOrders",
    input: WmsOrderGetOrdersInputSchema,
    output: WmsOrderGetOrdersOutputSchema,
  },
  {
    name: "extension.wms.order.requestCancelOrder",
    input: WmsOrderActionInputSchema,
    output: WmsOrderActionOutputSchema,
  },
  {
    name: "extension.wms.order.requestExchangeOrder",
    input: WmsOrderActionInputSchema,
    output: WmsOrderActionOutputSchema,
  },
  {
    name: "extension.wms.order.requestReturnOrder",
    input: WmsOrderActionInputSchema,
    output: WmsOrderActionOutputSchema,
  },
  {
    name: "extension.wms.order.restoreCanceledOrder",
    input: WmsOrderActionInputSchema,
    output: WmsOrderActionOutputSchema,
  },
  {
    name: "extension.wms.order.restoreExchangedOrder",
    input: WmsOrderActionInputSchema,
    output: WmsOrderActionOutputSchema,
  },
  {
    name: "extension.wms.order.restoreReturnedOrder",
    input: WmsOrderActionInputSchema,
    output: WmsOrderActionOutputSchema,
  },
  {
    name: "extension.wms.return.restoreOrder",
    input: RestoreWmsOrderInputSchema,
    output: WmsSuccessOutputSchema,
  },
  {
    name: "extension.wms.return.returnOrder",
    input: ReturnWmsOrderInputSchema,
    output: WmsSuccessOutputSchema,
  },
] satisfies FunctionSchemaDefinition[];

export function getExtensionFunctionSchemas(): FunctionSchema[] {
  return extensionFunctionSchemaDefinitions.map((definition) => {
    const schema: FunctionSchema = {
      name: definition.name,
      inputSchema: zodToJsonSchema(definition.input),
      outputSchema: zodToJsonSchema(definition.output),
    };
    return schema;
  });
}

export function getExtensionFunctionSchemasByExtension(): Record<string, FunctionSchema[]> {
  const grouped: Record<string, FunctionSchema[]> = {};
  for (const schema of getExtensionFunctionSchemas()) {
    const extensionName = extensionNameFromFunctionName(schema.name);
    grouped[extensionName] ??= [];
    grouped[extensionName].push(schema);
  }
  return grouped;
}

function extensionNameFromFunctionName(name: string): string {
  const parts = name.split(".");
  const extensionName = parts[1];
  if (
    parts.length < 3 ||
    parts[0] !== "extension" ||
    !extensionName ||
    parts.some((part) => part === "")
  ) {
    throw new Error(`Invalid extension function name: ${name}`);
  }
  return extensionName;
}
