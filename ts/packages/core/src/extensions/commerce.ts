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
  CommerceGetProductsInput as ProtoCommerceGetProductsInput,
  CommerceGetProductsOutput as ProtoCommerceGetProductsOutput,
  CommerceProduct as ProtoCommerceProduct,
  CommerceProductVariant as ProtoCommerceProductVariant,
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
  // 상위 항목의 productCode 와 같은 뜻(품목 단위 sku 와 다른 축).
  productCode: z.string().optional(),
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
  // 몰이 주문 안에서 이 상품 줄에 부여한 번호. id 와 달리 사람이 읽는 순번이다.
  itemNo: z.string().optional(),
  // 옵션 구성 방식(조합형·독립형·연동형 등) 원문 코드.
  optionType: z.string().optional(),
  // 배송 정보를 항목 단위로도 싣는다. fulfillments 는 배송 건 단위라 "이 상품의 송장번호" 를
  // 알려면 itemIds 로 되짚어야 한다.
  trackingNumber: z.string().optional(),
  trackingCompany: z.string().optional(),
  trackingCompanyName: z.string().optional(),
  // 이 항목이 속한 배송 건 코드. fulfillments[].id 와 대응한다.
  shippingCode: z.string().optional(),
  // 몰이 상품에 부여한 코드. productId(내부 식별자)·sku(품목 단위 재고 코드)와 다른 축이다.
  productCode: z.string().optional(),
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
  // 다른 *Options 와 같은 어휘다: required / optional 에는 getProducts 입력 필드명
  // (searchFilter·since·limit)을, 앱이 받는 searchFilter 키는 fieldConfigs["searchFilter.key"] 한 항목에
  // enum allowedValues 로 나열한다(getOrders 와 같은 방식). 필터 없이 불러도 첫 페이지를 돌려주므로
  // required 는 비운다.
  getProductsOptions: OperationOptionsSchema.optional(),
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

// --- product 그룹: 카탈로그 열람·ID 조회. 이름 검색은 받지 않는다 ---

export const CommerceProductVariantSchema = z.object({
  // getOrders 의 items[].variantId, requestExchangeOrder 의 afterExchangeItems[].variantId 와 같은 값이다.
  id: z.string(),
  // variant 의 절대 판매가. CommerceExchangeableVariant.additionalAmount(추가금)와 뜻이 다르다.
  price: z.number(),
  // 재고를 관리하지 않으면 비운다 — 0(품절)과 미제공은 다른 뜻이다.
  stockQuantity: z.number().optional(),
  options: z.array(CommerceVariantOptionSchema).optional(),
});
export type CommerceProductVariant = ProtoBacked<
  z.infer<typeof CommerceProductVariantSchema>,
  ProtoCommerceProductVariant
>;

export const CommerceProductSchema = z.object({
  // getOrders 의 items[].productId 와 같은 값이다.
  id: z.string(),
  name: z.string(),
  price: z.number(),
  originalPrice: z.number().optional(),
  currency: z.string().optional(),
  // 판단할 수 없으면 비운다 — 기본값으로 active 를 넣지 않는다. 닫힌 집합이라 몰 고유 상태(draft 등)는
  // 앱이 두 값으로 매핑한다.
  state: z.enum(["active", "inactive"]).optional(),
  imageUrl: z.string().optional(),
  // 상품 이미지 전체. 대표 이미지도 포함한다.
  images: z.array(z.string()).optional(),
  productUrl: z.string().optional(),
  description: z.string().optional(),
  summary: z.string().optional(),
  vendor: z.string().optional(),
  productType: z.string().optional(),
  // 카테고리 이름 목록.
  categories: z.array(z.string()).optional(),
  tags: z.array(z.string()).optional(),
  // 몰에서 상품이 만들어진 시각(epoch ms). searchFilter 의 createdAt 도 이 축이다.
  createdAt: z.number().optional(),
  // epoch ms. 몰의 수정 시각이 아니라 앱이 상품을 저장한 시각일 수 있다.
  updatedAt: z.number().optional(),
  variants: z.array(CommerceProductVariantSchema).optional(),
});
export type CommerceProduct = ProtoBacked<
  z.infer<typeof CommerceProductSchema>,
  ProtoCommerceProduct
>;

export const CommerceGetProductsInputSchema = z.object({
  // 공통 키는 productId(복수 id 조회 포함 — any-of 는 $eq 에 복수 values)·state·createdAt.
  // 광고하지 않은 키는 앱이 BadRequest 로 거부한다.
  searchFilter: z.any().optional(),
  since: z.string().optional(),
  // 앱이 기본값(10)과 상한(50)을 둔다.
  limit: z.number().int().optional(),
});
export type CommerceGetProductsInput = ProtoBacked<
  z.infer<typeof CommerceGetProductsInputSchema>,
  ProtoCommerceGetProductsInput
>;

export const CommerceGetProductsOutputSchema = z.object({
  products: z.array(CommerceProductSchema).optional(),
  next: z.string().optional(),
});
export type CommerceGetProductsOutput = ProtoBacked<
  z.infer<typeof CommerceGetProductsOutputSchema>,
  ProtoCommerceGetProductsOutput
>;
