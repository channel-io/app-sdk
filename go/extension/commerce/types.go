package commerce

import sdkv1 "github.com/channel-io/app-sdk/go/internal/gen/channel/app/sdk/v1"

const (
	ExtensionName = "commerce"
	SystemVersion = "v1"

	FunctionGetAppConfigs         = "extension.commerce.core.getAppConfigs"
	FunctionGetOrders             = "extension.commerce.order.getOrders"
	FunctionRequestCancelOrder    = "extension.commerce.order.requestCancelOrder"
	FunctionRequestReturnOrder    = "extension.commerce.order.requestReturnOrder"
	FunctionAcceptReturnOrder     = "extension.commerce.order.acceptReturnOrder"
	FunctionRequestExchangeOrder  = "extension.commerce.order.requestExchangeOrder"
	FunctionGetExchangeableItems  = "extension.commerce.order.getExchangeableItems"
	FunctionChangeShippingAddress = "extension.commerce.order.changeShippingAddress"
	FunctionGetProducts           = "extension.commerce.product.getProducts"
)

// commerce 전용 타입
type Order = sdkv1.CommerceOrder
type OrderItem = sdkv1.CommerceOrderItem
type OrderBundleItem = sdkv1.CommerceOrderBundleItem
type Identifier = sdkv1.CommerceIdentifier
type AppCapabilities = sdkv1.CommerceAppCapabilities
type GetOrdersInput = sdkv1.CommerceGetOrdersInput
type GetOrdersOutput = sdkv1.CommerceGetOrdersOutput
type GetAppConfigsInput = sdkv1.CommerceGetAppConfigsInput
type GetAppConfigsOutput = sdkv1.CommerceGetAppConfigsOutput
type ActionResult = sdkv1.CommerceActionResult
type CancelOrderInput = sdkv1.CommerceCancelOrderInput
type ReturnOrderInput = sdkv1.CommerceReturnOrderInput
type AcceptReturnOrderInput = sdkv1.CommerceAcceptReturnOrderInput
type ExchangeOrderInput = sdkv1.CommerceExchangeOrderInput
type GetExchangeableItemsInput = sdkv1.CommerceGetExchangeableItemsInput
type GetExchangeableItemsOutput = sdkv1.CommerceGetExchangeableItemsOutput
type ChangeShippingAddressInput = sdkv1.CommerceChangeShippingAddressInput
type GetProductsInput = sdkv1.CommerceGetProductsInput
type GetProductsOutput = sdkv1.CommerceGetProductsOutput

// 변경 없는 값 타입은 Order* / Buyer 재사용
type Buyer = sdkv1.Buyer
type Address = sdkv1.OrderAddress
type BankAccount = sdkv1.OrderBankAccount
type ClaimReason = sdkv1.OrderClaimReason
type ClaimItem = sdkv1.OrderClaimItem
type Claimability = sdkv1.OrderClaimability
type Claim = sdkv1.OrderClaim
type Payment = sdkv1.OrderPayment
type Fulfillment = sdkv1.OrderFulfillment
type FulfillmentItem = sdkv1.OrderFulfillmentItem
type ExchangeItem = sdkv1.OrderExchangeItem
type DefectInfo = sdkv1.OrderDefectInfo
type OperationOptions = sdkv1.OrderOperationOptions
type FieldConfig = sdkv1.OrderFieldConfig
type AllowedValue = sdkv1.OrderAllowedValue

// 주문에 딸린 값 타입. 생성 코드는 internal 이라 별칭 없이는 앱이 만들 수 없다.
type TaxLine = sdkv1.OrderTaxLine
type Attribute = sdkv1.OrderAttribute
type ShippingLine = sdkv1.OrderShippingLine
type Transaction = sdkv1.OrderTransaction
type Metafield = sdkv1.OrderMetafield

// 교환 후보. getExchangeableItems 응답에서만 채워진다.
type ExchangeableItem = sdkv1.CommerceExchangeableItem
type ExchangeableVariant = sdkv1.CommerceExchangeableVariant

// 상품 카탈로그. getProducts 응답에서만 채워진다. ProductVariant.Price 는 절대가라
// ExchangeableVariant.AdditionalAmount(추가금)와 뜻이 다르다.
type Product = sdkv1.CommerceProduct
type ProductVariant = sdkv1.CommerceProductVariant

// variant 옵션(name/value). 교환 후보와 상품 variant 가 함께 쓴다.
type VariantOption = sdkv1.CommerceVariantOption
