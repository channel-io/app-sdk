package wms_test

import (
	"context"
	"encoding/json"
	"reflect"
	"testing"

	"github.com/channel-io/app-sdk/go/appsdk"
	"github.com/channel-io/app-sdk/go/extension/schemaregistry"
	"github.com/channel-io/app-sdk/go/extension/wms"
)

func TestExtensionRegistersSelectedFunctions(t *testing.T) {
	app := appsdk.New(appsdk.Options{AppID: "app"})
	if err := app.Use(wms.Extension().
		GetSupportedCommerces(wms.StaticSupportedCommerces("app-cafe24")).
		GetOrders(func(context.Context, appsdk.Context, *wms.GetOrdersRequest) (*wms.GetOrdersResponse, error) {
			return &wms.GetOrdersResponse{Orders: []*wms.Order{{ExtId: "order-1", ExtCommerceOrderId: "commerce-order-1"}}}, nil
		}),
	); err != nil {
		t.Fatal(err)
	}

	methods := app.Methods()
	if len(methods) != 2 {
		t.Fatalf("expected 2 methods, got %d", len(methods))
	}
	if methods[0] != wms.FunctionGetSupportedCommerces || methods[1] != wms.FunctionGetOrders {
		t.Fatalf("unexpected methods: %v", methods)
	}
	targets := app.AutoRegisterTargets()
	if len(targets) != 1 || targets[0].Name != wms.ExtensionName || targets[0].SystemVersion != wms.SystemVersion {
		t.Fatalf("unexpected auto-register targets: %+v", targets)
	}

	schemas := app.Schemas()
	wantSupportedCommerces, ok := schemaregistry.Schema(wms.FunctionGetSupportedCommerces)
	if !ok {
		t.Fatalf("missing canonical schema for %s", wms.FunctionGetSupportedCommerces)
	}
	wantGetOrders, ok := schemaregistry.Schema(wms.FunctionGetOrders)
	if !ok {
		t.Fatalf("missing canonical schema for %s", wms.FunctionGetOrders)
	}
	if !reflect.DeepEqual(schemas[0], wantSupportedCommerces) || !reflect.DeepEqual(schemas[1], wantGetOrders) {
		t.Fatalf("wms schemas drifted from canonical registry")
	}

	res := app.HandleRequest(context.Background(), appsdk.FunctionRequest{
		Method: wms.FunctionGetOrders,
		Params: json.RawMessage(`{}`),
	})
	if res.Error != nil {
		t.Fatalf("unexpected error: %+v", res.Error)
	}
	var out map[string]any
	if err := json.Unmarshal(res.Result, &out); err != nil {
		t.Fatal(err)
	}
	orders := out["orders"].([]any)
	first := orders[0].(map[string]any)
	if len(orders) != 1 || first["extId"] != "order-1" {
		t.Fatalf("unexpected orders: %+v", out)
	}
}

func TestExtensionUsesProtoJSONNames(t *testing.T) {
	app := appsdk.New(appsdk.Options{AppID: "app"})
	if err := app.Use(wms.Extension().
		GetOrder(func(_ context.Context, _ appsdk.Context, input *wms.GetOrderRequest) (*wms.GetOrderResponse, error) {
			if input.GetCommerceOrderId() != "commerce-order-1" || input.GetShopId() != "shop-1" {
				t.Fatalf("unexpected input: %+v", input)
			}
			return &wms.GetOrderResponse{Order: &wms.Order{ExtCommerceOrderId: input.GetCommerceOrderId()}}, nil
		}),
	); err != nil {
		t.Fatal(err)
	}

	res := app.HandleRequest(context.Background(), appsdk.FunctionRequest{
		Method: wms.FunctionGetOrder,
		Params: json.RawMessage(`{"commerceOrderId":"commerce-order-1","shopId":"shop-1"}`),
	})
	if res.Error != nil {
		t.Fatalf("unexpected error: %+v", res.Error)
	}
	var out map[string]any
	if err := json.Unmarshal(res.Result, &out); err != nil {
		t.Fatal(err)
	}
	order, ok := out["order"].(map[string]any)
	if !ok || order["extCommerceOrderId"] != "commerce-order-1" {
		t.Fatalf("expected protojson camelCase output, got %+v", out)
	}
}

func TestGetShopIDResponseHelpersMarshalStringAndNull(t *testing.T) {
	app := appsdk.New(appsdk.Options{AppID: "app"})
	found := true
	if err := app.Use(wms.Extension().
		GetShopID(func(_ context.Context, _ appsdk.Context, _ *wms.GetShopIDRequest) (*wms.GetShopIDResponse, error) {
			if found {
				return wms.ShopIDFound("shop-1"), nil
			}
			return wms.ShopIDNotFound("not found"), nil
		}),
	); err != nil {
		t.Fatal(err)
	}

	res := app.HandleRequest(context.Background(), appsdk.FunctionRequest{
		Method: wms.FunctionGetShopID,
		Params: json.RawMessage(`{"commerceType":"appCafe24","commerceKey":"mall-1"}`),
	})
	if res.Error != nil {
		t.Fatalf("unexpected error: %+v", res.Error)
	}
	var out map[string]any
	if err := json.Unmarshal(res.Result, &out); err != nil {
		t.Fatal(err)
	}
	if out["shopId"] != "shop-1" {
		t.Fatalf("expected string shopId, got %+v", out)
	}

	shopID, ok := wms.ShopIDString(wms.ShopIDFound("shop-1"))
	if !ok || shopID != "shop-1" {
		t.Fatalf("unexpected shop ID helper result: %q %v", shopID, ok)
	}

	found = false
	res = app.HandleRequest(context.Background(), appsdk.FunctionRequest{
		Method: wms.FunctionGetShopID,
		Params: json.RawMessage(`{"commerceType":"appCafe24","commerceKey":"mall-1"}`),
	})
	if res.Error != nil {
		t.Fatalf("unexpected error: %+v", res.Error)
	}
	if err := json.Unmarshal(res.Result, &out); err != nil {
		t.Fatal(err)
	}
	if out["shopId"] != nil || out["message"] != "not found" {
		t.Fatalf("expected nullable shopId, got %+v", out)
	}
}

func TestCanonicalFunctionSchemasMatchRegistry(t *testing.T) {
	got := wms.CanonicalFunctionSchemas()
	names := []string{
		wms.FunctionGetSupportedCommerces,
		wms.FunctionGetOrders,
		wms.FunctionGetOrder,
		wms.FunctionCancelOrder,
		wms.FunctionRestoreCanceledOrder,
		wms.FunctionChangeShippingAddress,
		wms.FunctionGetShopID,
		wms.FunctionReturnOrder,
		wms.FunctionRestoreReturnedOrder,
		wms.FunctionExchangeOrder,
		wms.FunctionRestoreExchangedOrder,
		wms.FunctionGetAppConfigs,
		wms.FunctionOrderGetOrders,
		wms.FunctionOrderRequestCancelOrder,
		wms.FunctionOrderRestoreCanceledOrder,
		wms.FunctionOrderRequestReturnOrder,
		wms.FunctionOrderRestoreReturnedOrder,
		wms.FunctionOrderRequestExchangeOrder,
		wms.FunctionOrderRestoreExchangedOrder,
		wms.FunctionOrderChangeShippingAddress,
	}

	want := make([]appsdk.FunctionSchema, 0, len(names))
	for _, name := range names {
		schema, ok := schemaregistry.Schema(name)
		if !ok {
			t.Fatalf("missing canonical schema for %s", name)
		}
		want = append(want, schema)
	}

	if !reflect.DeepEqual(got, want) {
		t.Fatalf("canonical WMS schemas drifted from registry")
	}
}

func TestWmsValidationHelpers(t *testing.T) {
	if err := wms.ValidateGetOrdersRequest(&wms.GetOrdersRequest{OrderIds: " , "}); err == nil {
		t.Fatal("expected blank orderIds to fail")
	}
	if err := wms.ValidateGetOrderRequest(&wms.GetOrderRequest{}); err == nil {
		t.Fatal("expected missing identifier to fail")
	}
	if err := wms.ValidateGetOrderRequest(&wms.GetOrderRequest{OrderId: " "}); err == nil {
		t.Fatal("expected blank orderId to fail")
	}
	if err := wms.ValidateGetOrderRequest(&wms.GetOrderRequest{OrderId: "1", PackageId: "2"}); err == nil {
		t.Fatal("expected multiple identifiers to fail")
	}
	if err := wms.ValidateGetOrderRequest(&wms.GetOrderRequest{OrderId: "1"}); err != nil {
		t.Fatalf("expected one identifier to pass: %v", err)
	}
	if err := wms.ValidateRestoreOrderRequest(&wms.RestoreOrderRequest{OrderId: " "}); err == nil {
		t.Fatal("expected blank restore orderId to fail")
	}
	if err := wms.ValidateChangeShippingAddressRequest(&wms.ChangeShippingAddressRequest{OrderId: "1", Recipient: " ", Phone: "1", Address1: "1", PostalCode: "1"}); err == nil {
		t.Fatal("expected blank recipient to fail")
	}

	ids := wms.OrderStateIDs(&wms.OrderStateRequest{OrderId: " 1 "})
	if len(ids) != 1 || ids[0] != "1" {
		t.Fatalf("unexpected single id: %#v", ids)
	}
	ids = wms.OrderStateIDs(&wms.OrderStateRequest{OrderIds: "1, 2,,3"})
	if len(ids) != 3 || ids[0] != "1" || ids[1] != "2" || ids[2] != "3" {
		t.Fatalf("unexpected ids: %#v", ids)
	}
}
