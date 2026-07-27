package commerce_test

import (
	"context"
	"encoding/json"
	"reflect"
	"testing"

	"github.com/channel-io/app-sdk/go/appsdk"
	"github.com/channel-io/app-sdk/go/extension/commerce"
	"github.com/channel-io/app-sdk/go/extension/schemaregistry"
)

func zero[TIn any, TOut any]() appsdk.TypedHandlerFunc[TIn, TOut] {
	return func(context.Context, appsdk.Context, *TIn) (*TOut, error) {
		return new(TOut), nil
	}
}

func newExtension() appsdk.Extension {
	return commerce.Extension().
		GetAppConfigs(zero[commerce.GetAppConfigsInput, commerce.GetAppConfigsOutput]()).
		GetOrders(zero[commerce.GetOrdersInput, commerce.GetOrdersOutput]()).
		RequestCancelOrder(zero[commerce.CancelOrderInput, commerce.ActionResult]()).
		RequestReturnOrder(zero[commerce.ReturnOrderInput, commerce.ActionResult]()).
		AcceptReturnOrder(zero[commerce.AcceptReturnOrderInput, commerce.ActionResult]()).
		RequestExchangeOrder(zero[commerce.ExchangeOrderInput, commerce.ActionResult]()).
		GetExchangeableItems(zero[commerce.GetExchangeableItemsInput, commerce.GetExchangeableItemsOutput]()).
		ChangeShippingAddress(zero[commerce.ChangeShippingAddressInput, commerce.ActionResult]())
}

func TestExtensionRegistersFunctions(t *testing.T) {
	app := appsdk.New(appsdk.Options{AppID: "app"})
	if err := app.Use(newExtension()); err != nil {
		t.Fatal(err)
	}

	if got := len(app.Methods()); got != 8 {
		t.Fatalf("expected 8 methods, got %d", got)
	}

	targets := app.AutoRegisterTargets()
	if len(targets) != 1 || targets[0].Name != commerce.ExtensionName || targets[0].SystemVersion != commerce.SystemVersion {
		t.Fatalf("unexpected auto-register targets: %+v", targets)
	}
}

func TestSchemasMatchCanonicalRegistry(t *testing.T) {
	app := appsdk.New(appsdk.Options{AppID: "app"})
	if err := app.Use(newExtension()); err != nil {
		t.Fatal(err)
	}

	// app.Schemas() preserves registration order (see newExtension).
	names := []string{
		commerce.FunctionGetAppConfigs,
		commerce.FunctionGetOrders,
		commerce.FunctionRequestCancelOrder,
		commerce.FunctionRequestReturnOrder,
		commerce.FunctionAcceptReturnOrder,
		commerce.FunctionRequestExchangeOrder,
		commerce.FunctionGetExchangeableItems,
		commerce.FunctionChangeShippingAddress,
	}

	schemas := app.Schemas()
	if len(schemas) != len(names) {
		t.Fatalf("expected %d schemas, got %d", len(names), len(schemas))
	}
	for i, name := range names {
		want, ok := schemaregistry.Schema(name)
		if !ok {
			t.Fatalf("missing canonical schema for %s", name)
		}
		if !reflect.DeepEqual(schemas[i], want) {
			t.Fatalf("commerce schema for %s drifted from canonical registry", name)
		}
	}
}

func TestGetOrdersUsesProtoJSONNames(t *testing.T) {
	app := appsdk.New(appsdk.Options{AppID: "app"})
	if err := app.Use(commerce.Extension().
		GetOrders(func(_ context.Context, _ appsdk.Context, _ *commerce.GetOrdersInput) (*commerce.GetOrdersOutput, error) {
			return &commerce.GetOrdersOutput{Orders: []*commerce.Order{{Id: "order-1", OrderedAt: 1}}}, nil
		}),
	); err != nil {
		t.Fatal(err)
	}

	res := app.HandleRequest(context.Background(), appsdk.FunctionRequest{
		Method: commerce.FunctionGetOrders,
		Params: json.RawMessage(`{}`),
	})
	if res.Error != nil {
		t.Fatalf("unexpected error: %+v", res.Error)
	}
	var out map[string]any
	if err := json.Unmarshal(res.Result, &out); err != nil {
		t.Fatal(err)
	}
	orders, ok := out["orders"].([]any)
	if !ok || len(orders) != 1 {
		t.Fatalf("unexpected orders: %+v", out)
	}
	first := orders[0].(map[string]any)
	if first["id"] != "order-1" {
		t.Fatalf("expected protojson camelCase output, got %+v", out)
	}
}
