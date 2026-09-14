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
		ChangeShippingAddress(zero[commerce.ChangeShippingAddressInput, commerce.ActionResult]()).
		GetProducts(zero[commerce.GetProductsInput, commerce.GetProductsOutput]())
}

func TestExtensionRegistersFunctions(t *testing.T) {
	app := appsdk.New(appsdk.Options{AppID: "app"})
	if err := app.Use(newExtension()); err != nil {
		t.Fatal(err)
	}

	if got := len(app.Methods()); got != 9 {
		t.Fatalf("expected 9 methods, got %d", got)
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
		commerce.FunctionGetProducts,
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

func TestGetProductsKeepsZeroValuesAndOmitsUnsetFields(t *testing.T) {
	app := appsdk.New(appsdk.Options{AppID: "app"})
	price := 0.0
	if err := app.Use(commerce.Extension().
		GetProducts(func(_ context.Context, _ appsdk.Context, in *commerce.GetProductsInput) (*commerce.GetProductsOutput, error) {
			if in.GetLimit() != 20 {
				t.Fatalf("expected limit 20, got %d", in.GetLimit())
			}
			return &commerce.GetProductsOutput{
				Products: []*commerce.Product{{
					Id:    "product-1",
					Name:  "gift",
					Price: &price,
					Variants: []*commerce.ProductVariant{
						{Id: "variant-1", Price: &price},
						{Id: "variant-2", Price: &price, StockQuantity: &price},
					},
				}},
				Next: "cursor-2",
			}, nil
		}),
	); err != nil {
		t.Fatal(err)
	}

	res := app.HandleRequest(context.Background(), appsdk.FunctionRequest{
		Method: commerce.FunctionGetProducts,
		Params: json.RawMessage(`{"searchFilter":{"state":"active"},"limit":20}`),
	})
	if res.Error != nil {
		t.Fatalf("unexpected error: %+v", res.Error)
	}
	var out map[string]any
	if err := json.Unmarshal(res.Result, &out); err != nil {
		t.Fatal(err)
	}
	if out["next"] != "cursor-2" {
		t.Fatalf("expected next cursor, got %+v", out)
	}
	products, ok := out["products"].([]any)
	if !ok || len(products) != 1 {
		t.Fatalf("unexpected products: %+v", out)
	}
	first := products[0].(map[string]any)
	if first["id"] != "product-1" || first["price"] != 0.0 {
		t.Fatalf("expected protojson camelCase output with zero price kept, got %+v", first)
	}
	for _, key := range []string{"state", "originalPrice", "images", "categories", "tags"} {
		if _, present := first[key]; present {
			t.Fatalf("expected unset %s to be omitted, got %+v", key, first)
		}
	}
	variant := first["variants"].([]any)[0].(map[string]any)
	if variant["price"] != 0.0 {
		t.Fatalf("expected zero variant price kept, got %+v", variant)
	}
	if _, present := variant["stockQuantity"]; present {
		t.Fatalf("expected unset stockQuantity to be omitted, got %+v", variant)
	}
	soldOut := first["variants"].([]any)[1].(map[string]any)
	if soldOut["stockQuantity"] != 0.0 {
		t.Fatalf("expected zero stockQuantity kept (sold out), got %+v", soldOut)
	}
}
