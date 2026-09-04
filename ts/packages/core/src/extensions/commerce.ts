import { z } from "zod";
import type {
  CommerceActionResult as ProtoCommerceActionResult,
  CommerceAppCapabilities as ProtoCommerceAppCapabilities,
  CommerceCancelOrderInput as ProtoCommerceCancelOrderInput,
  CommerceChangeShippingAddressInput as ProtoCommerceChangeShippingAddressInput,
  CommerceExchangeOrderInput as ProtoCommerceExchangeOrderInput,
  CommerceGetAppConfigsOutput as ProtoCommerceGetAppConfigsOutput,
  CommerceGetExchangeableItemsInput as ProtoCommerceGetExchangeableItemsInput,
  CommerceGetExchangeableItemsOutput as ProtoCommerceGetExchangeableItemsOutput,
  CommerceGetOrdersInput as ProtoCommerceGetOrdersInput,
  CommerceGetOrdersOutput as ProtoCommerceGetOrdersOutput,
  CommerceIdentifier as ProtoCommerceIdentifier,
  CommerceOrder as ProtoCommerceOrder,
  CommerceOrderItem as ProtoCommerceOrderItem,
  CommerceAcceptReturnOrderInput as ProtoCommerceAcceptReturnOrderInput,
  CommerceReturnOrderInput as ProtoCommerceReturnOrderInput,
} from "../gen/channel/app/sdk/v1/extension.js";
import {
  AddressSchema,
  BankAccountSchema,
  BuyerSchema,
  ClaimReasonSchema,
  ClaimSchema,
  ClaimabilitySchema,
  DefectInfoSchema,
  FulfillmentSchema,
  OperationOptionsSchema,
  MetafieldSchema,
  OrderAttributeSchema,
  OrderClaimItemSchema,
  OrderExchangeItemSchema,
  PaymentSchema,
  ShippingLineSchema,
  TaxLineSchema,
  TransactionSchema,
} from "./order.js";

type ProtoBacked<T, Proto> = T & Proto;

// commerce = order 재설계: buyer 추가, createdAt→orderedAt, 액션 result 래핑.
// 변경 없는 값 타입(Buyer/Address/Payment/Fulfillment/Claim/Claimability)은 order 스키마 재사용.

export const CommerceOrderItemSchema = z.object({
  id: z.string(),
  name: z.string(),
  imageUrl: z.string().optional(),
  amount: z.number(),
  quantity: z.number(),
  option: z.string().optional(),
  productId: z.string().optional(),
  variantId: z.string().optional(),
  state: z.string(),
  shippedAt: z.number().optional(),
  deliveredAt: z.number().optional(),
  estimatedShipDate: z.number().optional(),
  claimability: ClaimabilitySchema,
  sku: z.string().optional(),
  // 0(전량 출하됨)과 미제공은 다른 뜻이라 optional 이다.
  unfulfilledQuantity: z.number().optional(),
  requiresShipping: z.boolean().optional(),
  // 정기구독 주문일 때만 채워진다.
  sellingPlanName: z.string().optional(),
  sellingPlanId: z.string().optional(),
  customAttributes: z.array(OrderAttributeSchema).optional(),
  taxLines: z.array(TaxLineSchema).optional(),
});
export type CommerceOrderItem = ProtoBacked<
  z.infer<typeof CommerceOrderItemSchema>,
  ProtoCommerceOrderItem
>;

export const CommerceOrderSchema = z.object({
  id: z.string(),
  title: z.string(),
  orderedAt: z.number(),
  buyer: BuyerSchema.optional(),
  items: z.array(CommerceOrderItemSchema),
  payment: PaymentSchema,
  fulfillments: z.array(FulfillmentSchema),
  shippingAddress: AddressSchema.optional(),
  claims: z.array(ClaimSchema),
  // 매니저가 몰 어드민의 해당 주문으로 바로 이동할 수 있는 링크.
  adminUrl: z.string().optional(),
  note: z.string().optional(),
  // payment.state 하나로는 부분환불·부분출하가 구분되지 않아 몰의 원문 상태를 함께 싣는다.
  displayFinancialStatus: z.string().optional(),
  displayFulfillmentStatus: z.string().optional(),
  test: z.boolean().optional(),
  firstOrder: z.boolean().optional(),
  closed: z.boolean().optional(),
  confirmed: z.boolean().optional(),
  taxesIncluded: z.boolean().optional(),
  totalWeight: z.number().optional(),
  // 주문이 생성된 경로(예: Online Store).
  appName: z.string().optional(),
  billingAddress: AddressSchema.optional(),
  customAttributes: z.array(OrderAttributeSchema).optional(),
  shippingLines: z.array(ShippingLineSchema).optional(),
  transactions: z.array(TransactionSchema).optional(),
  metafields: z.array(MetafieldSchema).optional(),
});
export type CommerceOrder = ProtoBacked<z.infer<typeof CommerceOrderSchema>, ProtoCommerceOrder>;

// --- I/O 스키마 (identifier + searchFilter + result 래핑) ---

export const CommerceIdentifierSchema = z.object({
  type: z.enum(["membership", "phone", "email"]),
  value: z.string(),
});
export type CommerceIdentifier = ProtoBacked<
  z.infer<typeof CommerceIdentifierSchema>,
  ProtoCommerceIdentifier
>;

export const CommerceGetOrdersInputSchema = z.object({
  identifier: CommerceIdentifierSchema.optional(),
  searchFilter: z.any().optional(),
  since: z.string().optional(),
  limit: z.number().int().optional(),
});
export type CommerceGetOrdersInput = ProtoBacked<
  z.infer<typeof CommerceGetOrdersInputSchema>,
  ProtoCommerceGetOrdersInput
>;

export const CommerceGetOrdersOutputSchema = z.object({
  orders: z.array(CommerceOrderSchema).optional(),
  next: z.string().optional(),
});
export type CommerceGetOrdersOutput = ProtoBacked<
  z.infer<typeof CommerceGetOrdersOutputSchema>,
  ProtoCommerceGetOrdersOutput
>;

export const CommerceAppCapabilitiesSchema = z.object({
  getOrdersOptions: OperationOptionsSchema.optional(),
  requestCancelOrderOptions: OperationOptionsSchema.optional(),
  requestReturnOrderOptions: OperationOptionsSchema.optional(),
  acceptReturnOrderOptions: OperationOptionsSchema.optional(),
  requestExchangeOrderOptions: OperationOptionsSchema.optional(),
  changeShippingAddressOptions: OperationOptionsSchema.optional(),
});
export type CommerceAppCapabilities = ProtoBacked<
  z.infer<typeof CommerceAppCapabilitiesSchema>,
  ProtoCommerceAppCapabilities
>;

export const CommerceGetAppConfigsOutputSchema = z.object({
  appCapabilities: CommerceAppCapabilitiesSchema.optional(),
});
export type CommerceGetAppConfigsOutput = ProtoBacked<
  z.infer<typeof CommerceGetAppConfigsOutputSchema>,
  ProtoCommerceGetAppConfigsOutput
>;

export const CommerceResultSchema = z.object({
  result: z.object({
    success: z.boolean(),
    errorMessage: z.string().optional(),
  }),
});
export type CommerceActionResult = ProtoBacked<
  z.infer<typeof CommerceResultSchema>,
  ProtoCommerceActionResult
>;

export const CommerceCancelOrderInputSchema = z.object({
  identifier: CommerceIdentifierSchema.optional(),
  orderId: z.string(),
  cancelItems: z.array(OrderClaimItemSchema).optional(),
  reason: ClaimReasonSchema.optional(),
  refundBankAccount: BankAccountSchema.optional(),
});
export type CommerceCancelOrderInput = ProtoBacked<
  z.infer<typeof CommerceCancelOrderInputSchema>,
  ProtoCommerceCancelOrderInput
>;

export const CommerceReturnOrderInputSchema = z.object({
  identifier: CommerceIdentifierSchema.optional(),
  orderId: z.string(),
  returnItems: z.array(OrderClaimItemSchema).optional(),
  reason: ClaimReasonSchema.optional(),
  requestPickup: z.boolean().optional(),
  pickupAddress: AddressSchema.optional(),
  refundBankAccount: BankAccountSchema.optional(),
  trackingNumber: z.string().optional(),
  trackingCompany: z.string().optional(),
  defectInfo: DefectInfoSchema.optional(),
});
export type CommerceReturnOrderInput = ProtoBacked<
  z.infer<typeof CommerceReturnOrderInputSchema>,
  ProtoCommerceReturnOrderInput
>;

export const CommerceAcceptReturnOrderInputSchema = z.object({
  identifier: CommerceIdentifierSchema.optional(),
  orderId: z.string(),
  returnItems: z.array(OrderClaimItemSchema).optional(),
  reason: ClaimReasonSchema.optional(),
  refundBankAccount: BankAccountSchema.optional(),
  pickupCompleted: z.boolean().optional(),
  requestPickup: z.boolean().optional(),
});
export type CommerceAcceptReturnOrderInput = ProtoBacked<
  z.infer<typeof CommerceAcceptReturnOrderInputSchema>,
  ProtoCommerceAcceptReturnOrderInput
>;

export const CommerceExchangeOrderInputSchema = z.object({
  identifier: CommerceIdentifierSchema.optional(),
  orderId: z.string(),
  beforeExchangeItems: z.array(OrderClaimItemSchema).optional(),
  afterExchangeItems: z.array(OrderExchangeItemSchema).optional(),
  reason: ClaimReasonSchema.optional(),
  requestPickup: z.boolean().optional(),
  pickupAddress: AddressSchema.optional(),
  refundBankAccount: BankAccountSchema.optional(),
  defectInfo: DefectInfoSchema.optional(),
});
export type CommerceExchangeOrderInput = ProtoBacked<
  z.infer<typeof CommerceExchangeOrderInputSchema>,
  ProtoCommerceExchangeOrderInput
>;

export const CommerceGetExchangeableItemsInputSchema = z.object({
  identifier: CommerceIdentifierSchema.optional(),
  orderId: z.string(),
  items: z.array(OrderClaimItemSchema).optional(),
});
export type CommerceGetExchangeableItemsInput = ProtoBacked<
  z.infer<typeof CommerceGetExchangeableItemsInputSchema>,
  ProtoCommerceGetExchangeableItemsInput
>;

export const CommerceGetExchangeableItemsOutputSchema = z.object({
  items: z.array(CommerceOrderItemSchema).optional(),
});
export type CommerceGetExchangeableItemsOutput = ProtoBacked<
  z.infer<typeof CommerceGetExchangeableItemsOutputSchema>,
  ProtoCommerceGetExchangeableItemsOutput
>;

export const CommerceChangeShippingAddressInputSchema = z.object({
  identifier: CommerceIdentifierSchema.optional(),
  orderId: z.string(),
  newAddress: AddressSchema,
});
export type CommerceChangeShippingAddressInput = ProtoBacked<
  z.infer<typeof CommerceChangeShippingAddressInputSchema>,
  ProtoCommerceChangeShippingAddressInput
>;
