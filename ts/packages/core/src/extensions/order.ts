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
  OrderFulfillmentItem as ProtoOrderFulfillmentItem,
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
  // ISO 3166-1 alpha-2. country 는 표시용 국가명이라 코드 비교에는 쓸 수 없다.
  countryCode: z.string().optional(),
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
  // 불가 사유. 플래그가 false 일 때 안내 문구로 쓴다. 사유를 주지 않는 커머스는 비운다.
  nonCancelableReason: z.string().optional(),
  nonReturnableReason: z.string().optional(),
  nonExchangeableReason: z.string().optional(),
  nonShippingAddressChangeableReason: z.string().optional(),
});
export type Claimability = ProtoBacked<z.infer<typeof ClaimabilitySchema>, ProtoClaimability>;

export const ClaimSchema = z.object({
  id: z.string(),
  extClaimId: z.string().optional(),
  type: z.string(),
  state: z.string(),
  itemIds: z.array(z.string()),
  // 클레임 생성 시각을 안 주는 몰이 있다. proto3 plain double 이라 presence 도 없어
  // 미제공과 0 이 구별되지 않고, protojson 이 0 을 생략해 키가 통째로 빠진다. 필수로 두면
  // 그 몰의 유효한 응답을 출력 검증이 거부하므로 — 지킬 수 없는 약속이라 계약에서 뗀다.
  createdAt: z.number().optional(),
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
  // proto3 message 필드라 암묵적 presence 를 갖는다 — 앱이 채우지 않으면 protojson 이 키를
  // 통째로 지운다. 안쪽 bool 네 개를 required 에서 뺀 것(V236)과 같은 이유가 한 단계 위에도
  // 그대로 적용된다: claimability 를 아예 계산하지 않는 몰의 정상 응답이 필수 선언 때문에
  // 검증에서 걸린다.
  claimability: ClaimabilitySchema.optional(),
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
  // 총액의 분해 항목. 상품 소계·배송비·할인을 따로 떼어 내려주지 않는 몰이 있다. presence 는
  // 있으므로 0 은 0 으로 실리고, 키가 없으면 "이 몰은 이 값을 분리해 주지 않는다" 는 뜻이다.
  // 어느 몰이든 내려주는 totalAmount 와 달리 분해 항목은 몰마다 갈려 필수로 둘 수 없다.
  itemsAmount: z.number().optional(),
  shippingAmount: z.number().optional(),
  discountAmount: z.number().optional(),
  // repeated 필드는 비면 protojson 이 키를 지운다. protobuf 는 repeated 에 presence 를
  // 줄 수 없어(optional 금지) 계약에서 필수를 뗀다 — 빈 목록과 미제공을 구별하지 않는다.
  methods: z.array(z.string()).optional(),
  // 환불 계좌 개념이 없는 결제수단·몰이 있다. presence 가 있어 false 는 false 로 실리고,
  // 키가 없으면 판단 자체를 하지 않는 몰이라는 뜻이다.
  requireRefundBankAccount: z.boolean().optional(),
  taxAmount: z.number().optional(),
  // discountAmount 는 아래 세 값의 합이다. 무엇으로 깎였는지 안내하려면 개별 값이 필요하다.
  pointAmount: z.number().optional(),
  creditAmount: z.number().optional(),
  couponDiscountAmount: z.number().optional(),
  // 아직 결제되지 않은 잔액(무통장 입금 대기, 부분 결제 등). state 만으로는 얼마가 남았는지 모른다.
  dueAmount: z.number().optional(),
});
export type Payment = ProtoBacked<z.infer<typeof PaymentSchema>, ProtoPayment>;

// 배송에 포함된 항목 하나와 그 항목의 상태.
export const FulfillmentItemSchema = z.object({
  itemId: z.string(),
  state: z.string().optional(),
});
export type FulfillmentItem = ProtoBacked<
  z.infer<typeof FulfillmentItemSchema>,
  ProtoOrderFulfillmentItem
>;

export const FulfillmentSchema = z.object({
  id: z.string(),
  state: z.string(),
  itemIds: z.array(z.string()),
  trackingNumber: z.string().optional(),
  trackingCompany: z.string().optional(),
  trackingUrl: z.string().optional(),
  estimatedDeliveryDate: z.number().optional(),
  // trackingCompany 에 몰의 택배사 코드가 들어가는 몰이 있어 사람이 읽을 수 없다. 표시용 이름.
  trackingCompanyName: z.string().optional(),
  // 한 배송 안에서도 항목별 상태가 갈리는 몰이 있다(부분 출하·부분 반품).
  // state 는 배송 단위, 항목별은 이쪽이다.
  items: z.array(FulfillmentItemSchema).optional(),
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
  // 클레임/배송은 없는 게 정상인데 repeated 라 비면 protojson 이 키를 지운다.
  // protobuf 가 repeated 에 presence 를 주지 못해 계약에서 필수를 뗀다.
  fulfillments: z.array(FulfillmentSchema).optional(),
  shippingAddress: AddressSchema.optional(),
  claims: z.array(ClaimSchema).optional(),
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
  // repeated 필드는 비면 protojson 이 키를 지운다. protobuf 는 repeated 에 presence 를
  // 줄 수 없어(optional 금지) 계약에서 필수를 뗀다 — 빈 목록과 미제공을 구별하지 않는다.
  required: z.array(z.string()).optional(),
  optional: z.array(z.string()).optional(),
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
