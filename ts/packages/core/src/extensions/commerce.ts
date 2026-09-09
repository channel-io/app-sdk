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
  CommerceExchangeableItem as ProtoCommerceExchangeableItem,
  CommerceExchangeableVariant as ProtoCommerceExchangeableVariant,
  CommerceOrderBundleItem as ProtoCommerceOrderBundleItem,
  CommerceVariantOption as ProtoCommerceVariantOption,
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

// 세트(번들) 상품의 구성품 한 줄. CommerceOrderItem 의 부분집합이라 규약이 같다.
export const CommerceOrderBundleItemSchema = z.object({
  productId: z.string().optional(),
  variantId: z.string().optional(),
  name: z.string().optional(),
  sku: z.string().optional(),
  option: z.string().optional(),
  quantity: z.number().optional(),
  amount: z.number().optional(),
  optionAmount: z.number().optional(),
  supplierId: z.string().optional(),
});
export type CommerceOrderBundleItem = ProtoBacked<
  z.infer<typeof CommerceOrderBundleItemSchema>,
  ProtoCommerceOrderBundleItem
>;

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
  // state 는 몰마다 다른 상태를 공통 값으로 정규화한 것이라, 몰 고유 상태로 분기해야 하는
  // 태스크는 원문이 필요하다. statusCode 는 진행 상태 코드, statusText 는 그 표시 문구다.
  statusCode: z.string().optional(),
  statusText: z.string().optional(),
  // 클레임 성격(정상·취소·반품·교환) 코드. 진행 상태와 축이 다르다.
  claimStatusCode: z.string().optional(),
  // 상품 공급사. 위탁·입점 구조인 몰에서 CS 안내에 쓰인다.
  supplierId: z.string().optional(),
  supplierName: z.string().optional(),
  // 옵션 추가금. amount 에 이미 합산돼 있으나 분리해 보여줘야 하는 몰이 있다.
  optionAmount: z.number().optional(),
  // 세트(번들) 상품 정보. 번들이 아니면 비어 있다.
  bundle: z.boolean().optional(),
  bundleId: z.string().optional(),
  bundleName: z.string().optional(),
  bundleType: z.string().optional(),
  bundleItems: z.array(CommerceOrderBundleItemSchema).optional(),
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
  // 클레임/배송은 없는 게 정상인데 repeated 라 비면 protojson 이 키를 지운다.
  // protobuf 가 repeated 에 presence 를 주지 못해 계약에서 필수를 뗀다.
  fulfillments: z.array(FulfillmentSchema).optional(),
  shippingAddress: AddressSchema.optional(),
  claims: z.array(ClaimSchema).optional(),
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
  // 외부 마켓(네이버·쿠팡 등)에서 유입된 주문이 어느 마켓 것인지. 자사몰 주문이면 빈 값이다.
  marketId: z.string().optional(),
  // 그 마켓이 발번한 주문번호. 몰 주문번호(id)와 달라 CS 조회 키로 쓰인다.
  marketOrderNo: z.string().optional(),
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

export const CommerceVariantOptionSchema = z.object({
  name: z.string(),
  value: z.string(),
});
export type CommerceVariantOption = ProtoBacked<
  z.infer<typeof CommerceVariantOptionSchema>,
  ProtoCommerceVariantOption
>;

export const CommerceExchangeableVariantSchema = z.object({
  id: z.string(),
  additionalAmount: z.number(),
  options: z.array(CommerceVariantOptionSchema).optional(),
  // 재고 관리를 쓰지 않으면 수량 개념이 없어 비운다 — 0(품절)과 미제공(무제한)은 다른 뜻이다.
  stockQuantity: z.number().optional(),
  useInventory: z.boolean().optional(),
  selling: z.boolean().optional(),
  display: z.boolean().optional(),
});
export type CommerceExchangeableVariant = ProtoBacked<
  z.infer<typeof CommerceExchangeableVariantSchema>,
  ProtoCommerceExchangeableVariant
>;

export const CommerceExchangeableItemSchema = z.object({
  // 교환 후보의 대상이 되는 주문 아이템 id. 입력 items[].id 와 같은 값이고,
  // requestExchangeOrder 의 beforeExchangeItems[].id 로 그대로 넘긴다.
  id: z.string(),
  productId: z.string().optional(),
  variants: z.array(CommerceExchangeableVariantSchema).optional(),
});
export type CommerceExchangeableItem = ProtoBacked<
  z.infer<typeof CommerceExchangeableItemSchema>,
  ProtoCommerceExchangeableItem
>;

export const CommerceGetExchangeableItemsOutputSchema = z.object({
  exchangeableItems: z.array(CommerceExchangeableItemSchema).optional(),
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
