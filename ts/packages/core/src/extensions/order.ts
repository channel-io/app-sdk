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
  OrderOperationOptions as ProtoOperationOptions,
  OrderPayment as ProtoPayment,
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

export const ClaimabilitySchema = z.object({
  cancelable: z.boolean(),
  returnable: z.boolean(),
  exchangeable: z.boolean(),
  shippingAddressChangeable: z.boolean(),
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
