package wms

import (
	"github.com/channel-io/app-sdk/go/appsdk"
	"github.com/channel-io/app-sdk/go/extension/schemaregistry"
)

func FunctionOptions(name string, opts ...appsdk.FunctionOption) []appsdk.FunctionOption {
	return schemaregistry.Append(name, opts...)
}

func CanonicalFunctionSchemas() []appsdk.FunctionSchema {
	names := []string{
		FunctionGetSupportedCommerces,
		FunctionGetOrders,
		FunctionGetOrder,
		FunctionCancelOrder,
		FunctionRestoreCanceledOrder,
		FunctionChangeShippingAddress,
		FunctionGetShopID,
		FunctionReturnOrder,
		FunctionRestoreReturnedOrder,
		FunctionExchangeOrder,
		FunctionRestoreExchangedOrder,
		FunctionGetAppConfigs,
		FunctionOrderGetOrders,
		FunctionOrderRequestCancelOrder,
		FunctionOrderRestoreCanceledOrder,
		FunctionOrderRequestReturnOrder,
		FunctionOrderRestoreReturnedOrder,
		FunctionOrderRequestExchangeOrder,
		FunctionOrderRestoreExchangedOrder,
		FunctionOrderChangeShippingAddress,
	}

	functions := make([]appsdk.FunctionSchema, 0, len(names))
	for _, name := range names {
		schema, ok := schemaregistry.Schema(name)
		if ok {
			functions = append(functions, schema)
		}
	}
	return functions
}
