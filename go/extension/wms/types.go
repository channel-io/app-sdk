package wms

import (
	"fmt"
	"strings"

	sdkv1 "github.com/channel-io/app-sdk/go/internal/gen/channel/app/sdk/v1"
	"google.golang.org/protobuf/types/known/structpb"
)

const (
	ExtensionName = "wms"
	SystemVersion = "v1"

	FunctionGetSupportedCommerces = "extension.wms.metadata.getSupportedCommerces"
	FunctionGetOrders             = "extension.wms.core.getOrders"
	FunctionGetOrder              = "extension.wms.core.getOrder"
	FunctionGetShopID             = "extension.wms.core.getShopId"
	FunctionCancelOrder           = "extension.wms.cancel.cancelOrder"
	FunctionRestoreCanceledOrder  = "extension.wms.cancel.restoreOrder"
	FunctionReturnOrder           = "extension.wms.return.returnOrder"
	FunctionRestoreReturnedOrder  = "extension.wms.return.restoreOrder"
	FunctionExchangeOrder         = "extension.wms.exchange.exchangeOrder"
	FunctionRestoreExchangedOrder = "extension.wms.exchange.restoreOrder"
	FunctionChangeShippingAddress = "extension.wms.edit.changeShippingAddress"

	// order group (전환용): getOrders는 WmsOrderV2, 액션은 result 래핑
	FunctionGetAppConfigs              = "extension.wms.core.getAppConfigs"
	FunctionOrderGetOrders             = "extension.wms.order.getOrders"
	FunctionOrderRequestCancelOrder    = "extension.wms.order.requestCancelOrder"
	FunctionOrderRestoreCanceledOrder  = "extension.wms.order.restoreCanceledOrder"
	FunctionOrderRequestReturnOrder    = "extension.wms.order.requestReturnOrder"
	FunctionOrderRestoreReturnedOrder  = "extension.wms.order.restoreReturnedOrder"
	FunctionOrderRequestExchangeOrder  = "extension.wms.order.requestExchangeOrder"
	FunctionOrderRestoreExchangedOrder = "extension.wms.order.restoreExchangedOrder"
	FunctionOrderChangeShippingAddress = "extension.wms.order.changeShippingAddress"

	CommerceTypeAppCafe24          = "appCafe24"
	CommerceTypeAppNaverSmartStore = "appNaverSmartStore"
	// CommerceTypeAppFlexg: commerceKey is the FlexG shop_id verbatim — a single
	// opaque token (may contain hyphens; no encoding or splitting).
	CommerceTypeAppFlexg = "appFlexg"
)

type ShippingInfo = sdkv1.WmsShippingInfo
type Delivery = sdkv1.WmsDelivery
type OrderItem = sdkv1.WmsOrderItem
type Order = sdkv1.WmsOrder

// order group (WmsOrderV2 기반) 타입
type Buyer = sdkv1.Buyer
type OrderV2 = sdkv1.WmsOrderV2
type OrderItemV2 = sdkv1.WmsOrderItemV2
type DeliveryV2 = sdkv1.WmsDeliveryV2
type Identifier = sdkv1.WmsIdentifier
type OrderGetOrdersRequest = sdkv1.WmsOrderGetOrdersRequest
type OrderGetOrdersResponse = sdkv1.WmsOrderGetOrdersResult
type OrderActionRequest = sdkv1.WmsOrderActionRequest
type OrderActionResponse = sdkv1.WmsOrderActionResult
type OrderActionResultBody = sdkv1.WmsOrderResultBody
type OrderChangeShippingAddressRequest = sdkv1.WmsOrderChangeShippingAddressInput
type GetAppConfigsRequest = sdkv1.WmsGetAppConfigsInput
type GetAppConfigsResponse = sdkv1.WmsGetAppConfigsOutput

type GetSupportedCommercesRequest = sdkv1.WmsGetSupportedCommercesRequest
type GetSupportedCommercesResponse = sdkv1.WmsGetSupportedCommercesResult
type GetOrdersRequest = sdkv1.WmsGetOrdersRequest
type GetOrdersResponse = sdkv1.WmsGetOrdersResult
type GetOrderRequest = sdkv1.WmsGetOrderRequest
type GetOrderResponse = sdkv1.WmsGetOrderResult
type GetOrderResult = sdkv1.WmsGetOrderResult
type GetShopIDRequest = sdkv1.WmsGetShopIDRequest
type GetShopIDResponse = sdkv1.WmsGetShopIDResult
type OrderStateRequest = sdkv1.WmsOrderStateRequest
type CancelOrderRequest = sdkv1.WmsOrderStateRequest
type ReturnOrderRequest = sdkv1.WmsOrderStateRequest
type ExchangeOrderRequest = sdkv1.WmsOrderStateRequest
type RestoreOrderRequest = sdkv1.WmsRestoreOrderRequest
type ChangeShippingAddressRequest = sdkv1.WmsChangeShippingAddressRequest
type SuccessResponse = sdkv1.WmsSuccessResult

func ShopIDFound(shopID string) *GetShopIDResponse {
	return &GetShopIDResponse{ShopId: structpb.NewStringValue(shopID)}
}

func ShopIDNotFound(message string) *GetShopIDResponse {
	return &GetShopIDResponse{
		ShopId:  structpb.NewNullValue(),
		Message: message,
	}
}

func ShopIDString(response *GetShopIDResponse) (string, bool) {
	if response == nil {
		return "", false
	}
	value := response.GetShopId()
	if value == nil {
		return "", false
	}
	if stringValue, ok := value.GetKind().(*structpb.Value_StringValue); ok {
		return stringValue.StringValue, true
	}
	return "", false
}

// OrderActionSucceeded builds a successful order-group action result
// (requestCancelOrder / changeShippingAddress / ...).
func OrderActionSucceeded() *OrderActionResponse {
	return &OrderActionResponse{Result: &OrderActionResultBody{Success: true}}
}

// OrderActionFailed builds a failed order-group action result with an error message.
func OrderActionFailed(message string) *OrderActionResponse {
	return &OrderActionResponse{Result: &OrderActionResultBody{Success: false, ErrorMessage: message}}
}

func SplitIDs(value string) []string {
	if value == "" {
		return nil
	}
	parts := strings.Split(value, ",")
	ids := make([]string, 0, len(parts))
	for _, part := range parts {
		if id := strings.TrimSpace(part); id != "" {
			ids = append(ids, id)
		}
	}
	return ids
}

func hasValue(value string) bool {
	return strings.TrimSpace(value) != ""
}

func OrderStateIDs(request *OrderStateRequest) []string {
	if request == nil {
		return nil
	}
	if id := strings.TrimSpace(request.GetOrderId()); id != "" {
		return []string{id}
	}
	return SplitIDs(request.GetOrderIds())
}

func ValidateGetOrdersRequest(request *GetOrdersRequest) error {
	if request == nil ||
		(len(SplitIDs(request.GetCommerceOrderIds())) == 0 &&
			len(SplitIDs(request.GetOrderIds())) == 0 &&
			len(SplitIDs(request.GetPackageIds())) == 0) {
		return fmt.Errorf("at least one of commerceOrderIds, orderIds, or packageIds is required")
	}
	return nil
}

func ValidateGetOrderRequest(request *GetOrderRequest) error {
	if request == nil {
		return fmt.Errorf("exactly one of commerceOrderId, orderId, or packageId is required")
	}
	count := 0
	if hasValue(request.GetCommerceOrderId()) {
		count++
	}
	if hasValue(request.GetOrderId()) {
		count++
	}
	if hasValue(request.GetPackageId()) {
		count++
	}
	if count == 0 {
		return fmt.Errorf("exactly one of commerceOrderId, orderId, or packageId is required")
	}
	if count > 1 {
		return fmt.Errorf("only one of commerceOrderId, orderId, or packageId is allowed")
	}
	return nil
}

func ValidateOrderStateRequest(request *OrderStateRequest) error {
	if len(OrderStateIDs(request)) == 0 {
		return fmt.Errorf("either orderId or orderIds is required")
	}
	return nil
}

func ValidateRestoreOrderRequest(request *RestoreOrderRequest) error {
	if request == nil || !hasValue(request.GetOrderId()) {
		return fmt.Errorf("orderId is required")
	}
	return nil
}

func ValidateChangeShippingAddressRequest(request *ChangeShippingAddressRequest) error {
	if request == nil || !hasValue(request.GetOrderId()) {
		return fmt.Errorf("orderId is required")
	}
	if !hasValue(request.GetRecipient()) {
		return fmt.Errorf("recipient is required")
	}
	if !hasValue(request.GetPhone()) {
		return fmt.Errorf("phone is required")
	}
	if !hasValue(request.GetAddress1()) {
		return fmt.Errorf("address1 is required")
	}
	if !hasValue(request.GetPostalCode()) {
		return fmt.Errorf("postalCode is required")
	}
	return nil
}
