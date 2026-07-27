package wms

import (
	"context"

	"github.com/channel-io/app-sdk/go/appsdk"
	extensionkit "github.com/channel-io/app-sdk/go/extension"
	"github.com/channel-io/app-sdk/go/extension/schemaregistry"
)

type ExtensionBuilder struct {
	base *extensionkit.Builder
}

func Extension() *ExtensionBuilder {
	return &ExtensionBuilder{base: extensionkit.New(ExtensionName, extensionkit.SystemVersion(SystemVersion))}
}

func (b *ExtensionBuilder) GetSupportedCommerces(handler appsdk.TypedHandlerFunc[GetSupportedCommercesRequest, GetSupportedCommercesResponse]) *ExtensionBuilder {
	b.base.Func(FunctionGetSupportedCommerces, schemaregistry.Append(FunctionGetSupportedCommerces, appsdk.HandleProto(handler))...)
	return b
}

func (b *ExtensionBuilder) GetOrders(handler appsdk.TypedHandlerFunc[GetOrdersRequest, GetOrdersResponse]) *ExtensionBuilder {
	b.base.Func(FunctionGetOrders, schemaregistry.Append(FunctionGetOrders, appsdk.HandleProto(handler))...)
	return b
}

func (b *ExtensionBuilder) GetOrder(handler appsdk.TypedHandlerFunc[GetOrderRequest, GetOrderResponse]) *ExtensionBuilder {
	b.base.Func(FunctionGetOrder, schemaregistry.Append(FunctionGetOrder, appsdk.HandleProto(handler))...)
	return b
}

func (b *ExtensionBuilder) GetShopID(handler appsdk.TypedHandlerFunc[GetShopIDRequest, GetShopIDResponse]) *ExtensionBuilder {
	b.base.Func(FunctionGetShopID, schemaregistry.Append(FunctionGetShopID, appsdk.HandleProto(handler))...)
	return b
}

func (b *ExtensionBuilder) CancelOrder(handler appsdk.TypedHandlerFunc[CancelOrderRequest, SuccessResponse]) *ExtensionBuilder {
	b.base.Func(FunctionCancelOrder, schemaregistry.Append(FunctionCancelOrder, appsdk.HandleProto(handler))...)
	return b
}

func (b *ExtensionBuilder) RestoreCanceledOrder(handler appsdk.TypedHandlerFunc[RestoreOrderRequest, SuccessResponse]) *ExtensionBuilder {
	b.base.Func(FunctionRestoreCanceledOrder, schemaregistry.Append(FunctionRestoreCanceledOrder, appsdk.HandleProto(handler))...)
	return b
}

func (b *ExtensionBuilder) ReturnOrder(handler appsdk.TypedHandlerFunc[ReturnOrderRequest, SuccessResponse]) *ExtensionBuilder {
	b.base.Func(FunctionReturnOrder, schemaregistry.Append(FunctionReturnOrder, appsdk.HandleProto(handler))...)
	return b
}

func (b *ExtensionBuilder) RestoreReturnedOrder(handler appsdk.TypedHandlerFunc[RestoreOrderRequest, SuccessResponse]) *ExtensionBuilder {
	b.base.Func(FunctionRestoreReturnedOrder, schemaregistry.Append(FunctionRestoreReturnedOrder, appsdk.HandleProto(handler))...)
	return b
}

func (b *ExtensionBuilder) ExchangeOrder(handler appsdk.TypedHandlerFunc[ExchangeOrderRequest, SuccessResponse]) *ExtensionBuilder {
	b.base.Func(FunctionExchangeOrder, schemaregistry.Append(FunctionExchangeOrder, appsdk.HandleProto(handler))...)
	return b
}

func (b *ExtensionBuilder) RestoreExchangedOrder(handler appsdk.TypedHandlerFunc[RestoreOrderRequest, SuccessResponse]) *ExtensionBuilder {
	b.base.Func(FunctionRestoreExchangedOrder, schemaregistry.Append(FunctionRestoreExchangedOrder, appsdk.HandleProto(handler))...)
	return b
}

func (b *ExtensionBuilder) ChangeShippingAddress(handler appsdk.TypedHandlerFunc[ChangeShippingAddressRequest, SuccessResponse]) *ExtensionBuilder {
	b.base.Func(FunctionChangeShippingAddress, schemaregistry.Append(FunctionChangeShippingAddress, appsdk.HandleProto(handler))...)
	return b
}

// --- order group (전환용) ---

func (b *ExtensionBuilder) GetAppConfigs(handler appsdk.TypedHandlerFunc[GetAppConfigsRequest, GetAppConfigsResponse]) *ExtensionBuilder {
	b.base.Func(FunctionGetAppConfigs, schemaregistry.Append(FunctionGetAppConfigs, appsdk.HandleProto(handler))...)
	return b
}

func (b *ExtensionBuilder) OrderGetOrders(handler appsdk.TypedHandlerFunc[OrderGetOrdersRequest, OrderGetOrdersResponse]) *ExtensionBuilder {
	b.base.Func(FunctionOrderGetOrders, schemaregistry.Append(FunctionOrderGetOrders, appsdk.HandleProto(handler))...)
	return b
}

func (b *ExtensionBuilder) OrderRequestCancelOrder(handler appsdk.TypedHandlerFunc[OrderActionRequest, OrderActionResponse]) *ExtensionBuilder {
	b.base.Func(FunctionOrderRequestCancelOrder, schemaregistry.Append(FunctionOrderRequestCancelOrder, appsdk.HandleProto(handler))...)
	return b
}

func (b *ExtensionBuilder) OrderRestoreCanceledOrder(handler appsdk.TypedHandlerFunc[OrderActionRequest, OrderActionResponse]) *ExtensionBuilder {
	b.base.Func(FunctionOrderRestoreCanceledOrder, schemaregistry.Append(FunctionOrderRestoreCanceledOrder, appsdk.HandleProto(handler))...)
	return b
}

func (b *ExtensionBuilder) OrderRequestReturnOrder(handler appsdk.TypedHandlerFunc[OrderActionRequest, OrderActionResponse]) *ExtensionBuilder {
	b.base.Func(FunctionOrderRequestReturnOrder, schemaregistry.Append(FunctionOrderRequestReturnOrder, appsdk.HandleProto(handler))...)
	return b
}

func (b *ExtensionBuilder) OrderRestoreReturnedOrder(handler appsdk.TypedHandlerFunc[OrderActionRequest, OrderActionResponse]) *ExtensionBuilder {
	b.base.Func(FunctionOrderRestoreReturnedOrder, schemaregistry.Append(FunctionOrderRestoreReturnedOrder, appsdk.HandleProto(handler))...)
	return b
}

func (b *ExtensionBuilder) OrderRequestExchangeOrder(handler appsdk.TypedHandlerFunc[OrderActionRequest, OrderActionResponse]) *ExtensionBuilder {
	b.base.Func(FunctionOrderRequestExchangeOrder, schemaregistry.Append(FunctionOrderRequestExchangeOrder, appsdk.HandleProto(handler))...)
	return b
}

func (b *ExtensionBuilder) OrderRestoreExchangedOrder(handler appsdk.TypedHandlerFunc[OrderActionRequest, OrderActionResponse]) *ExtensionBuilder {
	b.base.Func(FunctionOrderRestoreExchangedOrder, schemaregistry.Append(FunctionOrderRestoreExchangedOrder, appsdk.HandleProto(handler))...)
	return b
}

func (b *ExtensionBuilder) OrderChangeShippingAddress(handler appsdk.TypedHandlerFunc[OrderChangeShippingAddressRequest, OrderActionResponse]) *ExtensionBuilder {
	b.base.Func(FunctionOrderChangeShippingAddress, schemaregistry.Append(FunctionOrderChangeShippingAddress, appsdk.HandleProto(handler))...)
	return b
}

func (b *ExtensionBuilder) Function(name string, opts ...appsdk.FunctionOption) *ExtensionBuilder {
	b.base.Func(name, opts...)
	return b
}

func (b *ExtensionBuilder) ExtensionFunction(name string, opts ...appsdk.FunctionOption) *ExtensionBuilder {
	b.base.ExtensionFunc(name, opts...)
	return b
}

func (b *ExtensionBuilder) Register(app *appsdk.App) error {
	return b.base.Register(app)
}

func StaticSupportedCommerces(commerceTypes ...string) appsdk.TypedHandlerFunc[GetSupportedCommercesRequest, GetSupportedCommercesResponse] {
	return func(_ context.Context, _ appsdk.Context, _ *GetSupportedCommercesRequest) (*GetSupportedCommercesResponse, error) {
		return &GetSupportedCommercesResponse{CommerceTypes: commerceTypes}, nil
	}
}
