import { z } from "zod";
import type {
  WmsChangeShippingAddressRequest as ProtoChangeWmsShippingAddressInput,
  WmsDelivery as ProtoWmsDelivery,
  WmsGetOrderRequest as ProtoGetWmsOrderInput,
  WmsGetOrderResult as ProtoGetWmsOrderOutput,
  WmsGetOrdersRequest as ProtoGetWmsOrdersInput,
  WmsGetOrdersResult as ProtoGetWmsOrdersOutput,
  WmsGetShopIDRequest as ProtoGetWmsShopIdInput,
  WmsGetShopIDResult as ProtoGetWmsShopIdOutput,
  WmsGetSupportedCommercesRequest as ProtoGetWmsSupportedCommercesInput,
  WmsGetSupportedCommercesResult as ProtoGetWmsSupportedCommercesOutput,
  WmsOrder as ProtoWmsOrder,
  WmsOrderItem as ProtoWmsOrderItem,
  WmsOrderStateRequest as ProtoWmsOrderStateRequest,
  WmsRestoreOrderRequest as ProtoRestoreWmsOrderInput,
  WmsShippingInfo as ProtoWmsShippingInfo,
  WmsSuccessResult as ProtoWmsSuccessOutput,
  WmsAppCapabilities as ProtoWmsAppCapabilities,
  WmsDeliveryV2 as ProtoWmsDeliveryV2,
  WmsGetAppConfigsInput as ProtoWmsGetAppConfigsInput,
  WmsGetAppConfigsOutput as ProtoWmsGetAppConfigsOutput,
  WmsIdentifier as ProtoWmsIdentifier,
  WmsOperationOptions as ProtoWmsOperationOptions,
  WmsOrderActionRequest as ProtoWmsOrderActionRequest,
  WmsOrderActionResult as ProtoWmsOrderActionResult,
  WmsOrderChangeShippingAddressInput as ProtoWmsOrderChangeShippingAddressInput,
  WmsOrderGetOrdersRequest as ProtoWmsOrderGetOrdersRequest,
  WmsOrderGetOrdersResult as ProtoWmsOrderGetOrdersResult,
  WmsOrderItemV2 as ProtoWmsOrderItemV2,
  WmsOrderV2 as ProtoWmsOrderV2,
} from "../gen/channel/app/sdk/v1/extension.js";
import { AddressSchema, BuyerSchema, FieldConfigSchema } from "./order.js";

type ProtoBacked<T, Proto> = T & Proto;

/**
 * WMS shipping information schema
 */
export const WmsShippingInfoSchema = z.object({
  name: z.string(),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  mobileNumber: z.string(),
  landlineNumber: z.string().optional(),
  zipcode: z.string(),
  address1: z.string(),
  address2: z.string(),
  country: z.string().optional(),
  province: z.string().optional(),
  message: z.string().optional(),
});
export type WmsShippingInfo = ProtoBacked<
  z.infer<typeof WmsShippingInfoSchema>,
  ProtoWmsShippingInfo
>;

/**
 * WMS delivery schema
 */
export const WmsDeliverySchema = z.object({
  extId: z.string(),
  itemIds: z.array(z.string()),
});
export type WmsDelivery = ProtoBacked<z.infer<typeof WmsDeliverySchema>, ProtoWmsDelivery>;

/**
 * WMS order item schema
 */
export const WmsOrderItemSchema = z.object({
  extId: z.string(),
  extCommerceOrderItemId: z.string(),
  productName: z.string().optional(),
  quantity: z.number().optional(),
  state: z.string().optional(),
  packageId: z.string().optional(),
  estimatedShipDate: z.string().optional(),
  invoiceNumber: z.string().optional(),
  deliveryCompany: z.string().optional(),
  shippingInfo: WmsShippingInfoSchema.optional(),
});
export type WmsOrderItem = ProtoBacked<z.infer<typeof WmsOrderItemSchema>, ProtoWmsOrderItem>;

/**
 * WMS order schema
 */
export const WmsOrderSchema = z.object({
  extId: z.string().optional(),
  extCommerceOrderId: z.string(),
  items: z.array(WmsOrderItemSchema),
  deliveries: z.array(WmsDeliverySchema),
});
export type WmsOrder = ProtoBacked<z.infer<typeof WmsOrderSchema>, ProtoWmsOrder>;

// =====================================================
// Function Input/Output Schemas
// =====================================================

// --- core ---

export const GetWmsOrdersInputSchema = z.object({
  commerceOrderIds: z.string().optional(),
  orderIds: z.string().optional(),
  packageIds: z.string().optional(),
  shopId: z.string().optional(),
});
export type GetWmsOrdersInput = ProtoBacked<
  z.infer<typeof GetWmsOrdersInputSchema>,
  ProtoGetWmsOrdersInput
>;

export const GetWmsOrdersOutputSchema = z.object({
  orders: z.array(WmsOrderSchema),
});
export type GetWmsOrdersOutput = ProtoBacked<
  z.infer<typeof GetWmsOrdersOutputSchema>,
  ProtoGetWmsOrdersOutput
>;

export const GetWmsOrderInputSchema = z.object({
  commerceOrderId: z.string().optional(),
  orderId: z.string().optional(),
  packageId: z.string().optional(),
  shopId: z.string().optional(),
});
export type GetWmsOrderInput = ProtoBacked<
  z.infer<typeof GetWmsOrderInputSchema>,
  ProtoGetWmsOrderInput
>;

export const GetWmsOrderOutputSchema = z.object({
  order: WmsOrderSchema,
});
export type GetWmsOrderOutput = ProtoBacked<
  z.infer<typeof GetWmsOrderOutputSchema>,
  ProtoGetWmsOrderOutput
>;

/**
 * Commerce-scoped WMS shop lookup.
 *
 * Current commerce key shapes:
 * - Cafe24: `commerceType` is `appCafe24`, `commerceKey` is
 *   `{encode(mallId)}-{shopNo}-{encode(shopName)}`.
 *   Producers emit this shape; WMS readers may retain `{mallId}-{shopNo}` compatibility parsing.
 * - Naver SmartStore: `commerceType` is `appNaverSmartStore`, `commerceKey` is
 *   `{encode(accountId)}-{encode(accountUid)}`. Both parts are required.
 *
 * Treat `commerceKey` as a commerce-owned opaque string. If a commerce key has
 * multiple parts, split on unencoded `-` first, then decode each part. Source
 * hyphens inside each part must be encoded as `%2D` before joining.
 */
export const GetWmsShopIdInputSchema = z.object({
  commerceType: z.string(),
  commerceKey: z.string(),
});
export type GetWmsShopIdInput = ProtoBacked<
  z.infer<typeof GetWmsShopIdInputSchema>,
  ProtoGetWmsShopIdInput
>;

export const GetWmsShopIdOutputSchema = z.object({
  shopId: z.string().nullable(),
  message: z.string().optional(),
});
export type GetWmsShopIdOutput = ProtoBacked<
  z.infer<typeof GetWmsShopIdOutputSchema>,
  ProtoGetWmsShopIdOutput
>;

export const GetWmsSupportedCommercesInputSchema = z.object({});
export type GetWmsSupportedCommercesInput = ProtoBacked<
  z.infer<typeof GetWmsSupportedCommercesInputSchema>,
  ProtoGetWmsSupportedCommercesInput
>;

export const GetWmsSupportedCommercesOutputSchema = z.object({
  commerceTypes: z.array(z.string()),
});
export type GetWmsSupportedCommercesOutput = ProtoBacked<
  z.infer<typeof GetWmsSupportedCommercesOutputSchema>,
  ProtoGetWmsSupportedCommercesOutput
>;

function hasOrderIdentifier(params: {
  orderId?: string | undefined;
  orderIds?: string | undefined;
}): boolean {
  return params.orderId !== undefined || params.orderIds !== undefined;
}

// --- cancel ---

export const CancelWmsOrderInputSchema = z
  .object({
    orderId: z.string().optional(),
    /** @deprecated Use orderId instead. */
    orderIds: z.string().optional(),
    reason: z.string().optional(),
  })
  .refine(hasOrderIdentifier, {
    message: "Either orderId or orderIds is required",
    path: ["orderId"],
  });
export type CancelWmsOrderInput = ProtoBacked<
  z.infer<typeof CancelWmsOrderInputSchema>,
  ProtoWmsOrderStateRequest
>;

// --- return ---

export const ReturnWmsOrderInputSchema = z
  .object({
    orderId: z.string().optional(),
    /** @deprecated Use orderId instead. */
    orderIds: z.string().optional(),
    reason: z.string().optional(),
    memo: z.string().optional(),
  })
  .refine(hasOrderIdentifier, {
    message: "Either orderId or orderIds is required",
    path: ["orderId"],
  });
export type ReturnWmsOrderInput = ProtoBacked<
  z.infer<typeof ReturnWmsOrderInputSchema>,
  ProtoWmsOrderStateRequest
>;

// --- exchange ---

export const ExchangeWmsOrderInputSchema = z
  .object({
    orderId: z.string().optional(),
    /** @deprecated Use orderId instead. */
    orderIds: z.string().optional(),
    reason: z.string().optional(),
    memo: z.string().optional(),
  })
  .refine(hasOrderIdentifier, {
    message: "Either orderId or orderIds is required",
    path: ["orderId"],
  });
export type ExchangeWmsOrderInput = ProtoBacked<
  z.infer<typeof ExchangeWmsOrderInputSchema>,
  ProtoWmsOrderStateRequest
>;

// --- edit ---

export const ChangeWmsShippingAddressInputSchema = z.object({
  orderId: z.string(),
  recipient: z.string(),
  phone: z.string(),
  address1: z.string(),
  postalCode: z.string(),
  address2: z.string().optional(),
  message: z.string().optional(),
});
export type ChangeWmsShippingAddressInput = ProtoBacked<
  z.infer<typeof ChangeWmsShippingAddressInputSchema>,
  ProtoChangeWmsShippingAddressInput
>;

// --- restore ---

export const RestoreWmsOrderInputSchema = z.object({
  orderId: z.string(),
  memo: z.string().optional(),
  prdSeq: z.string().optional(),
  restorePack: z.boolean().optional(),
  restockNormal: z.boolean().optional(),
  restockBad: z.boolean().optional(),
});
export type RestoreWmsOrderInput = ProtoBacked<
  z.infer<typeof RestoreWmsOrderInputSchema>,
  ProtoRestoreWmsOrderInput
>;

export const WmsSuccessOutputSchema = z.object({
  success: z.boolean(),
  message: z.string().optional(),
});
export type WmsSuccessOutput = ProtoBacked<
  z.infer<typeof WmsSuccessOutputSchema>,
  ProtoWmsSuccessOutput
>;

// =====================================================
// order group (전환용): WmsOrderV2 + result-wrapped actions
// =====================================================

export const WmsDeliveryV2Schema = z.object({
  id: z.string(),
  itemIds: z.array(z.string()),
});
export type WmsDeliveryV2 = ProtoBacked<z.infer<typeof WmsDeliveryV2Schema>, ProtoWmsDeliveryV2>;

export const WmsOrderItemV2Schema = z.object({
  id: z.string(),
  commerceOrderItemId: z.string(),
  productName: z.string().optional(),
  quantity: z.number().optional(),
  state: z.string().optional(),
  packageId: z.string().optional(),
  estimatedShipDate: z.string().optional(),
  invoiceNumber: z.string().optional(),
  deliveryCompany: z.string().optional(),
});
export type WmsOrderItemV2 = ProtoBacked<z.infer<typeof WmsOrderItemV2Schema>, ProtoWmsOrderItemV2>;

export const WmsOrderV2Schema = z.object({
  id: z.string(),
  commerceOrderId: z.string(),
  buyer: BuyerSchema.optional(),
  items: z.array(WmsOrderItemV2Schema),
  deliveries: z.array(WmsDeliveryV2Schema),
});
export type WmsOrderV2 = ProtoBacked<z.infer<typeof WmsOrderV2Schema>, ProtoWmsOrderV2>;

export const WmsIdentifierSchema = z.object({
  type: z.enum(["membership", "phone", "email"]),
  value: z.string(),
});
export type WmsIdentifier = ProtoBacked<z.infer<typeof WmsIdentifierSchema>, ProtoWmsIdentifier>;

// --- order.getOrders ---

export const WmsOrderGetOrdersInputSchema = z.object({
  identifier: WmsIdentifierSchema.optional(),
  searchFilter: z.any().optional(),
  shopId: z.string().optional(),
  since: z.string().optional(),
  limit: z.number().int().optional(),
});
export type WmsOrderGetOrdersInput = ProtoBacked<
  z.infer<typeof WmsOrderGetOrdersInputSchema>,
  ProtoWmsOrderGetOrdersRequest
>;

export const WmsOrderGetOrdersOutputSchema = z.object({
  orders: z.array(WmsOrderV2Schema),
  next: z.string().optional(),
});
export type WmsOrderGetOrdersOutput = ProtoBacked<
  z.infer<typeof WmsOrderGetOrdersOutputSchema>,
  ProtoWmsOrderGetOrdersResult
>;

// --- order actions (cancel/return/exchange, request·restore 공통) ---

export const WmsOrderActionInputSchema = z.object({
  identifier: WmsIdentifierSchema.optional(),
  orderIds: z.array(z.string()),
  reason: z.string().optional(),
  memo: z.string().optional(),
});
export type WmsOrderActionInput = ProtoBacked<
  z.infer<typeof WmsOrderActionInputSchema>,
  ProtoWmsOrderActionRequest
>;

const WmsOrderResultBodySchema = z.object({
  success: z.boolean(),
  errorMessage: z.string().optional(),
});

export const WmsOrderActionOutputSchema = z.object({
  result: WmsOrderResultBodySchema,
});
export type WmsOrderActionOutput = ProtoBacked<
  z.infer<typeof WmsOrderActionOutputSchema>,
  ProtoWmsOrderActionResult
>;

// --- order.changeShippingAddress ---

export const WmsOrderChangeShippingAddressInputSchema = z.object({
  identifier: WmsIdentifierSchema.optional(),
  orderId: z.string(),
  newAddress: AddressSchema,
  reason: z.string().optional(),
  memo: z.string().optional(),
});
export type WmsOrderChangeShippingAddressInput = ProtoBacked<
  z.infer<typeof WmsOrderChangeShippingAddressInputSchema>,
  ProtoWmsOrderChangeShippingAddressInput
>;

// --- core.getAppConfigs ---

export const WmsOperationOptionsSchema = z.object({
  required: z.array(z.string()).optional(),
  optional: z.array(z.string()).optional(),
  fieldConfigs: z.record(z.string(), FieldConfigSchema).optional(),
});
export type WmsOperationOptions = ProtoBacked<
  z.infer<typeof WmsOperationOptionsSchema>,
  ProtoWmsOperationOptions
>;

export const WmsAppCapabilitiesSchema = z.object({
  getOrdersOptions: WmsOperationOptionsSchema.optional(),
  requestCancelOrderOptions: WmsOperationOptionsSchema.optional(),
  restoreCanceledOrderOptions: WmsOperationOptionsSchema.optional(),
  requestReturnOrderOptions: WmsOperationOptionsSchema.optional(),
  restoreReturnedOrderOptions: WmsOperationOptionsSchema.optional(),
  requestExchangeOrderOptions: WmsOperationOptionsSchema.optional(),
  restoreExchangedOrderOptions: WmsOperationOptionsSchema.optional(),
  changeShippingAddressOptions: WmsOperationOptionsSchema.optional(),
});
export type WmsAppCapabilities = ProtoBacked<
  z.infer<typeof WmsAppCapabilitiesSchema>,
  ProtoWmsAppCapabilities
>;

export const WmsGetAppConfigsInputSchema = z.object({});
export type WmsGetAppConfigsInput = ProtoBacked<
  z.infer<typeof WmsGetAppConfigsInputSchema>,
  ProtoWmsGetAppConfigsInput
>;

export const WmsGetAppConfigsOutputSchema = z.object({
  appCapabilities: WmsAppCapabilitiesSchema.optional(),
});
export type WmsGetAppConfigsOutput = ProtoBacked<
  z.infer<typeof WmsGetAppConfigsOutputSchema>,
  ProtoWmsGetAppConfigsOutput
>;
