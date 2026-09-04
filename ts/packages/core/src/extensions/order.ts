import { z } from "zod";
import type {
  Buyer as ProtoBuyer,
  Order as ProtoOrder,
  OrderAddress as ProtoAddress,
  OrderAppCapabilities as ProtoAppCapabilities,
  OrderBankAccount as ProtoBankAccount,
  OrderClaim as ProtoClaim,
  OrderClaimability as ProtoClaimability,
  OrderClaimItem as ProtoOrderClaimItem,
  OrderClaimReason as ProtoClaimReason,
  OrderDefectInfo as ProtoDefectInfo,
  OrderExchangeItem as ProtoOrderExchangeItem,
  OrderFieldConfig as ProtoFieldConfig,
  OrderFulfillment as ProtoFulfillment,
  OrderItem as ProtoOrderItem,
  OrderAttribute as ProtoOrderAttribute,
  OrderMetafield as ProtoOrderMetafield,
  OrderOperationOptions as ProtoOperationOptions,
  OrderPayment as ProtoPayment,
  OrderShippingLine as ProtoOrderShippingLine,
  OrderTaxLine as ProtoOrderTaxLine,
  OrderTransaction as ProtoOrderTransaction,
} from "../gen/channel/app/sdk/v1/extension.js";

type ProtoBacked<T, Proto> = T & Proto;

// =====================================================
// Data Models
// =====================================================

// Shared buyer value type (proto `Buyer`), reused by order-group / commerce / wms extensions.
export const BuyerSchema = z.object({
  memberId: z.string().optional(),
  email: z.string().optional(),
  phone: z.string().optional(),
  name: z.string().optional(),
});
export type Buyer = ProtoBacked<z.infer<typeof BuyerSchema>, ProtoBuyer>;

export const AddressSchema = z.object({
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  phoneNumber: z.string().optional(),
  email: z.string().optional(),
  cellPhoneNumber: z.string().optional(),
  zipcode: z.string().optional(),
  address1: z.string().optional(),
  address2: z.string().optional(),
  shippingMessage: z.string().optional(),
  country: z.string().optional(),
  city: z.string().optional(),
  province: z.string().optional(),
});
export type Address = ProtoBacked<z.infer<typeof AddressSchema>, ProtoAddress>;

export const BankAccountSchema = z.object({
  bankName: z.string(),
  accountNo: z.string(),
  accountHolder: z.string(),
});
export type BankAccount = ProtoBacked<z.infer<typeof BankAccountSchema>, ProtoBankAccount>;

export const DefectInfoSchema = z.object({
  description: z.string(),
  imageUrls: z.array(z.string()).optional(),
});
export type DefectInfo = ProtoBacked<z.infer<typeof DefectInfoSchema>, ProtoDefectInfo>;

export const ClaimReasonSchema = z.object({
  type: z.string().optional(),
  description: z.string().optional(),
});
export type ClaimReason = ProtoBacked<z.infer<typeof ClaimReasonSchema>, ProtoClaimReason>;

// 네 값 모두 optional 이다. proto 가 presence 를 쓰므로 일부 또는 전부가 없는 payload 도
// 계약상 유효하다 — 전부 없으면 "판정 못 함" 이라는 뜻이다. 여기서 필수로 두면 그 상태를
// 표현할 수 없고, TS 앱의 출력 검증(outputSchema.parse)이 유효한 응답을 거부한다.
export const ClaimabilitySchema = z.object({
  cancelable: z.boolean().optional(),
  returnable: z.boolean().optional(),
  exchangeable: z.boolean().optional(),
  shippingAddressChangeable: z.boolean().optional(),
});
export type Claimability = ProtoBacked<z.infer<typeof ClaimabilitySchema>, ProtoClaimability>;

export const ClaimSchema = z.object({
  id: z.string(),
  extClaimId: z.string().optional(),
  type: z.string(),
  state: z.string(),
  itemIds: z.array(z.string()),
  createdAt: z.number(),
});
export type Claim = ProtoBacked<z.infer<typeof ClaimSchema>, ProtoClaim>;

export const OrderItemSchema = z.object({
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
});
export type OrderItem = ProtoBacked<z.infer<typeof OrderItemSchema>, ProtoOrderItem>;

export const OrderClaimItemSchema = z.object({
  id: z.string().optional(),
  quantity: z.number().int().optional(),
  fulfillmentId: z.string().optional(),
});
export type OrderClaimItem = ProtoBacked<z.infer<typeof OrderClaimItemSchema>, ProtoOrderClaimItem>;

export const OrderExchangeItemSchema = z.object({
  productId: z.string().optional(),
  variantId: z.string().optional(),
  quantity: z.number().int().optional(),
});
export type OrderExchangeItem = ProtoBacked<
  z.infer<typeof OrderExchangeItemSchema>,
  ProtoOrderExchangeItem
>;

export const PaymentSchema = z.object({
  state: z.string(),
  currency: z.string(),
  totalAmount: z.number(),
  itemsAmount: z.number(),
  shippingAmount: z.number(),
  discountAmount: z.number(),
  methods: z.array(z.string()),
  requireRefundBankAccount: z.boolean(),
  taxAmount: z.number().optional(),
});
export type Payment = ProtoBacked<z.infer<typeof PaymentSchema>, ProtoPayment>;

export const FulfillmentSchema = z.object({
  id: z.string(),
  state: z.string(),
  itemIds: z.array(z.string()),
  trackingNumber: z.string().optional(),
  trackingCompany: z.string().optional(),
  trackingUrl: z.string().optional(),
  estimatedDeliveryDate: z.number().optional(),
});
export type Fulfillment = ProtoBacked<z.infer<typeof FulfillmentSchema>, ProtoFulfillment>;

// 세금 한 줄. 주문·배송수단·아이템 어디에도 붙을 수 있다.
export const TaxLineSchema = z.object({
  rate: z.number().optional(),
  ratePercentage: z.number().optional(),
  title: z.string().optional(),
  amount: z.number().optional(),
});
export type TaxLine = ProtoBacked<z.infer<typeof TaxLineSchema>, ProtoOrderTaxLine>;

// 몰이 주문·아이템에 붙인 자유 키-값(선물 메시지, 각인 문구 등).
export const OrderAttributeSchema = z.object({
  key: z.string(),
  value: z.string().optional(),
});
export type OrderAttribute = ProtoBacked<z.infer<typeof OrderAttributeSchema>, ProtoOrderAttribute>;

// 주문에 적용된 배송수단 한 건.
export const ShippingLineSchema = z.object({
  id: z.string().optional(),
  title: z.string().optional(),
  code: z.string().optional(),
  carrierIdentifier: z.string().optional(),
  taxLines: z.array(TaxLineSchema).optional(),
});
export type ShippingLine = ProtoBacked<z.infer<typeof ShippingLineSchema>, ProtoOrderShippingLine>;

// 결제·환불 트랜잭션 한 건. payment.methods 는 게이트웨이 이름만 담아 착불·후불을 구분하지
// 못하므로 kind/status/gateway/manualPaymentGateway 를 그대로 보존한다.
export const TransactionSchema = z.object({
  id: z.string().optional(),
  parentId: z.string().optional(),
  kind: z.string().optional(),
  status: z.string().optional(),
  gateway: z.string().optional(),
  manualPaymentGateway: z.boolean().optional(),
  amount: z.number().optional(),
  currency: z.string().optional(),
  createdAt: z.number().optional(),
});
export type Transaction = ProtoBacked<z.infer<typeof TransactionSchema>, ProtoOrderTransaction>;

// 몰이 붙인 확장 속성. value 는 type 에 따라 형태가 달라 해석하지 않는다.
export const MetafieldSchema = z.object({
  namespace: z.string().optional(),
  key: z.string(),
  value: z.string().optional(),
  type: z.string().optional(),
});
export type Metafield = ProtoBacked<z.infer<typeof MetafieldSchema>, ProtoOrderMetafield>;

export const OrderSchema = z.object({
  id: z.string(),
  title: z.string(),
  createdAt: z.number(),
  items: z.array(OrderItemSchema),
  payment: PaymentSchema,
  fulfillments: z.array(FulfillmentSchema),
  shippingAddress: AddressSchema.optional(),
  claims: z.array(ClaimSchema),
});
export type Order = ProtoBacked<z.infer<typeof OrderSchema>, ProtoOrder>;

// =====================================================
// getAppConfigs Types
// =====================================================

const AllowedValueSchema = z.object({ value: z.string(), label: z.string() });

export const FieldConfigSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("enum"),
    allowedValues: z.array(AllowedValueSchema).min(1),
  }),
  z.object({
    type: z.literal("freeform"),
    description: z.string().optional(),
  }),
]);
export type FieldConfig = ProtoBacked<z.infer<typeof FieldConfigSchema>, ProtoFieldConfig>;

export const OperationOptionsSchema = z.object({
  required: z.array(z.string()),
  optional: z.array(z.string()),
  fieldConfigs: z.record(z.string(), FieldConfigSchema).optional(),
});
export type OperationOptions = ProtoBacked<
  z.infer<typeof OperationOptionsSchema>,
  ProtoOperationOptions
>;

export const AppCapabilitiesSchema = z.object({
  getOrdersOptions: OperationOptionsSchema,
  cancelOrderOptions: OperationOptionsSchema,
  returnOrderOptions: OperationOptionsSchema,
  exchangeOrderOptions: OperationOptionsSchema,
  changeAddressOptions: OperationOptionsSchema,
});
export type AppCapabilities = ProtoBacked<
  z.infer<typeof AppCapabilitiesSchema>,
  ProtoAppCapabilities
>;
