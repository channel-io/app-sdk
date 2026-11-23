package commerce_test

import (
	"context"
	"encoding/json"
	"testing"

	"github.com/channel-io/app-sdk/go/appsdk"
	"github.com/channel-io/app-sdk/go/extension/commerce"
)

func TestSearchProductPreservesExistingSearchWireNamesAndZeroValues(t *testing.T) {
	app := appsdk.New(appsdk.Options{AppID: "app"})
	zero := 0.0
	managed := true
	err := app.Use(commerce.Extension().SearchProduct(func(_ context.Context, _ appsdk.Context, input *commerce.SearchProductInput) (*commerce.SearchProductOutput, error) {
		if input.GetSize() != 1000 || input.GetSince() != "opaque" || input.GetQuery() != "" {
			t.Fatalf("search input changed: %+v", input)
		}
		return &commerce.SearchProductOutput{Products: []*commerce.SearchProduct{{Id: "1001", Name: "gift", Amount: &zero,
			Variants: []*commerce.SearchProductVariant{{VariantId: "v1", Quantity: &zero, UseInventory: &managed}}}}, Next: "page-2"}, nil
	}))
	if err != nil {
		t.Fatal(err)
	}
	response := app.HandleRequest(context.Background(), appsdk.FunctionRequest{Method: commerce.FunctionSearchProduct,
		Params: json.RawMessage(`{"size":1000,"since":"opaque"}`)})
	if response.Error != nil {
		t.Fatalf("unexpected function error: %+v", response.Error)
	}
	var decoded map[string]any
	if err := json.Unmarshal(response.Result, &decoded); err != nil {
		t.Fatal(err)
	}
	product := decoded["products"].([]any)[0].(map[string]any)
	variant := product["variants"].([]any)[0].(map[string]any)
	if product["amount"] != zero || variant["quantity"] != zero || variant["variantId"] != "v1" || decoded["next"] != "page-2" {
		t.Fatalf("search response changed: %+v", decoded)
	}
	if _, wrongContract := product["price"]; wrongContract {
		t.Fatal("search results must keep amount instead of the getProducts price field")
	}
}

func TestSearchProductEmptyPageKeepsRequiredProductsArray(t *testing.T) {
	app := appsdk.New(appsdk.Options{AppID: "app"})
	if err := app.Use(commerce.Extension().SearchProduct(func(context.Context, appsdk.Context, *commerce.SearchProductInput) (*commerce.SearchProductOutput, error) {
		return &commerce.SearchProductOutput{Next: "more"}, nil
	})); err != nil {
		t.Fatal(err)
	}
	response := app.HandleRequest(context.Background(), appsdk.FunctionRequest{Method: commerce.FunctionSearchProduct, Params: json.RawMessage(`{}`)})
	if response.Error != nil {
		t.Fatalf("unexpected function error: %+v", response.Error)
	}
	var got map[string]any
	if err := json.Unmarshal(response.Result, &got); err != nil {
		t.Fatal(err)
	}
	products, ok := got["products"].([]any)
	if !ok || len(products) != 0 || got["next"] != "more" {
		t.Fatalf("empty page contract changed: %s", response.Result)
	}
}

func TestSearchProductKeepsNumericImageAndTimestampContract(t *testing.T) {
	app := appsdk.New(appsdk.Options{AppID: "app"})
	stamp := 1795400000123.0
	zero := 0.0
	if err := app.Use(commerce.Extension().SearchProduct(func(context.Context, appsdk.Context, *commerce.SearchProductInput) (*commerce.SearchProductOutput, error) {
		return &commerce.SearchProductOutput{Products: []*commerce.SearchProduct{{CreatedAt: &stamp, UpdatedAt: &stamp, DefaultImage: &commerce.SearchProductImage{Size: &zero, Width: &zero, Height: &zero}, Variants: []*commerce.SearchProductVariant{{Options: []*commerce.SearchProductOption{{Value: "red"}, {}}}}}}}, nil
	})); err != nil {
		t.Fatal(err)
	}
	response := app.HandleRequest(context.Background(), appsdk.FunctionRequest{Method: commerce.FunctionSearchProduct, Params: json.RawMessage(`{}`)})
	if response.Error != nil {
		t.Fatalf("unexpected function error: %+v", response.Error)
	}
	var got struct {
		Products []struct {
			ID           string         `json:"id"`
			Name         string         `json:"name"`
			CreatedAt    float64        `json:"createdAt"`
			UpdatedAt    float64        `json:"updatedAt"`
			DefaultImage map[string]any `json:"defaultImage"`
		} `json:"products"`
	}
	if err := json.Unmarshal(response.Result, &got); err != nil {
		t.Fatal(err)
	}
	if len(got.Products) != 1 || got.Products[0].CreatedAt != stamp || got.Products[0].UpdatedAt != stamp {
		t.Fatalf("timestamps changed: %s", response.Result)
	}
	image := got.Products[0].DefaultImage
	for _, key := range []string{"size", "width", "height"} {
		if image[key] != zero {
			t.Fatalf("numeric image field %s changed: %s", key, response.Result)
		}
	}
	for _, key := range []string{"bucket", "key", "id", "type", "name"} {
		if image[key] != "" {
			t.Fatalf("required image field %s missing: %s", key, response.Result)
		}
	}
	var fields map[string]any
	if err := json.Unmarshal(response.Result, &fields); err != nil {
		t.Fatal(err)
	}
	product := fields["products"].([]any)[0].(map[string]any)
	if _, ok := product["id"]; !ok {
		t.Fatal("required id missing")
	}
	if _, ok := product["name"]; !ok {
		t.Fatal("required name missing")
	}
}

func TestSearchProductLeavesOversizedAndNegativeSizesToCore(t *testing.T) {
	for _, size := range []float64{2147483648, -2147483649} {
		app := appsdk.New(appsdk.Options{AppID: "app"})
		called := false
		if err := app.Use(commerce.Extension().SearchProduct(func(_ context.Context, _ appsdk.Context, input *commerce.SearchProductInput) (*commerce.SearchProductOutput, error) {
			called = true
			if input.GetSize() != size {
				t.Fatalf("size changed: %v", input.GetSize())
			}
			return &commerce.SearchProductOutput{}, nil
		})); err != nil {
			t.Fatal(err)
		}
		raw, _ := json.Marshal(map[string]any{"size": size})
		response := app.HandleRequest(context.Background(), appsdk.FunctionRequest{Method: commerce.FunctionSearchProduct, Params: raw})
		if response.Error != nil || !called {
			t.Fatalf("size %v rejected before core: %+v", size, response.Error)
		}
	}
}

func TestSearchProductRejectsFractionalSizeBeforeHandler(t *testing.T) {
	app := appsdk.New(appsdk.Options{AppID: "app"})
	called := false
	if err := app.Use(commerce.Extension().SearchProduct(func(context.Context, appsdk.Context, *commerce.SearchProductInput) (*commerce.SearchProductOutput, error) {
		called = true
		return &commerce.SearchProductOutput{}, nil
	})); err != nil {
		t.Fatal(err)
	}
	response := app.HandleRequest(context.Background(), appsdk.FunctionRequest{Method: commerce.FunctionSearchProduct, Params: json.RawMessage(`{"size":1.5}`)})
	if response.Error == nil || response.Error.Code != appsdk.CodeBadRequest || called {
		t.Fatalf("fractional size reached handler: %+v", response.Error)
	}
}
