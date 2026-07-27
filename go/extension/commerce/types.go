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
)

// commerce 전용 타입
type Order = sdkv1.CommerceOrder
type OrderItem = sdkv1.CommerceOrderItem
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
type ExchangeItem = sdkv1.OrderExchangeItem
type DefectInfo = sdkv1.OrderDefectInfo
type OperationOptions = sdkv1.OrderOperationOptions
type FieldConfig = sdkv1.OrderFieldConfig
type AllowedValue = sdkv1.OrderAllowedValue
