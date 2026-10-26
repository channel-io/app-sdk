package appsdk_test

import (
	"context"
	"encoding/json"
	"errors"
	"testing"

	"github.com/channel-io/app-sdk/go/appsdk"
	"github.com/channel-io/app-sdk/go/extension"
	sdkv1 "github.com/channel-io/app-sdk/go/internal/gen/channel/app/sdk/v1"
	"github.com/channel-io/app-sdk/go/schema"
)

type echoInput struct {
	Message string `json:"message"`
}

type echoOutput struct {
	Message string `json:"message"`
}

type validatedInput struct {
	Message string `json:"message"`
}

func (i *validatedInput) Validate() error {
	if i.Message == "" {
		return errors.New("message is required")
	}
	return nil
}

func TestAppTypedFunction(t *testing.T) {
	app := appsdk.New(appsdk.Options{AppID: "app"})
	app.Func(
		"extension.test.echo",
		appsdk.Input[echoInput](),
		appsdk.Output[echoOutput](),
		appsdk.Handle(func(_ context.Context, _ appsdk.Context, in *echoInput) (*echoOutput, error) {
			return &echoOutput{Message: in.Message}, nil
		}),
	)

	params := json.RawMessage(`{"message":"hello"}`)
	res := app.HandleRequest(context.Background(), appsdk.FunctionRequest{Method: "extension.test.echo", Params: params})
	if res.Error != nil {
		t.Fatalf("unexpected error: %+v", res.Error)
	}

	var out echoOutput
	if err := json.Unmarshal(res.Result, &out); err != nil {
		t.Fatal(err)
	}
	if out.Message != "hello" {
		t.Fatalf("unexpected message: %s", out.Message)
	}
}

func TestRegisterDerivesSchemasAndHandler(t *testing.T) {
	app := appsdk.New(appsdk.Options{AppID: "app"})
	if err := appsdk.Register(
		app,
		"extension.test.register",
		func(_ context.Context, _ appsdk.Context, in *echoInput) (*echoOutput, error) {
			return &echoOutput{Message: in.Message}, nil
		},
		appsdk.Description("Registered function"),
	); err != nil {
		t.Fatal(err)
	}

	schemas := app.Schemas()
	if len(schemas) != 1 {
		t.Fatalf("expected one schema, got %d", len(schemas))
	}
	if schemas[0].InputSchema["type"] != "object" || schemas[0].OutputSchema["type"] != "object" {
		t.Fatalf("expected derived schemas, got %#v %#v", schemas[0].InputSchema, schemas[0].OutputSchema)
	}
	if schemas[0].Description != "Registered function" {
		t.Fatalf("expected description option, got %q", schemas[0].Description)
	}
}

func TestAppTestFunctionsAreDiscoveredSeparately(t *testing.T) {
	app := appsdk.New(appsdk.Options{AppID: "app"})
	app.Func(
		"extension.test.public",
		appsdk.Handle(func(context.Context, appsdk.Context, *echoInput) (*echoOutput, error) {
			return &echoOutput{}, nil
		}),
	)
	app.TestFunc(
		"extension.test.only",
		appsdk.Handle(func(context.Context, appsdk.Context, *echoInput) (*echoOutput, error) {
			return &echoOutput{}, nil
		}),
	)

	publicRes := app.HandleRequest(context.Background(), appsdk.FunctionRequest{Method: appsdk.MethodGetFunctions})
	if publicRes.Error != nil {
		t.Fatalf("unexpected public discovery error: %+v", publicRes.Error)
	}
	var public appsdk.GetFunctionsResult
	if err := json.Unmarshal(publicRes.Result, &public); err != nil {
		t.Fatal(err)
	}
	if len(public.Functions) != 1 || public.Functions[0].Name != "extension.test.public" {
		t.Fatalf("unexpected public functions: %+v", public.Functions)
	}

	testRes := app.HandleRequest(context.Background(), appsdk.FunctionRequest{Method: appsdk.MethodGetTestFunctions})
	if testRes.Error != nil {
		t.Fatalf("unexpected test discovery error: %+v", testRes.Error)
	}
	var tests appsdk.GetFunctionsResult
	if err := json.Unmarshal(testRes.Result, &tests); err != nil {
		t.Fatal(err)
	}
	if len(tests.Functions) != 1 || tests.Functions[0].Name != "extension.test.only" {
		t.Fatalf("unexpected test functions: %+v", tests.Functions)
	}
}

func TestHiddenFunctionIsCallableButNotDiscovered(t *testing.T) {
	app := appsdk.New(appsdk.Options{AppID: "app"})
	app.Func(
		"legacy.echo",
		appsdk.Hidden(),
		appsdk.Handle(func(context.Context, appsdk.Context, *echoInput) (*echoOutput, error) {
			return &echoOutput{Message: "hidden"}, nil
		}),
	)

	if !app.HasMethod("legacy.echo") {
		t.Fatal("expected hidden function to be callable")
	}

	publicRes := app.HandleRequest(context.Background(), appsdk.FunctionRequest{Method: appsdk.MethodGetFunctions})
	if publicRes.Error != nil {
		t.Fatalf("unexpected discovery error: %+v", publicRes.Error)
	}
	var public appsdk.GetFunctionsResult
	if err := json.Unmarshal(publicRes.Result, &public); err != nil {
		t.Fatal(err)
	}
	if len(public.Functions) != 0 {
		t.Fatalf("expected hidden function to be omitted from discovery, got %+v", public.Functions)
	}

	callRes := app.HandleRequest(context.Background(), appsdk.FunctionRequest{Method: "legacy.echo"})
	if callRes.Error != nil {
		t.Fatalf("unexpected call error: %+v", callRes.Error)
	}
}

func TestDeprecatedFunctionDiscoveryAndCalls(t *testing.T) {
	for _, mode := range []string{"typed", "test", "extension"} {
		for _, tc := range []struct {
			name    string
			opts    []appsdk.FunctionOption
			present bool
			value   bool
			hidden  bool
		}{
			{name: "absent"},
			{name: "true", opts: []appsdk.FunctionOption{appsdk.Deprecated(true)}, present: true, value: true},
			{name: "false", opts: []appsdk.FunctionOption{appsdk.Deprecated(false)}, present: true},
			{name: "override", opts: []appsdk.FunctionOption{appsdk.Deprecated(true), appsdk.Deprecated(false)}, present: true},
			{name: "hidden", opts: []appsdk.FunctionOption{appsdk.Deprecated(true), appsdk.Hidden()}, hidden: true},
		} {
			t.Run(mode+"/"+tc.name, func(t *testing.T) {
				app := appsdk.New(appsdk.Options{AppID: "app"})
				handler := func(_ context.Context, _ appsdk.Context, in *echoInput) (*echoOutput, error) {
					return &echoOutput{Message: in.Message}, nil
				}
				name := "orders.get"
				switch mode {
				case "typed":
					appsdk.MustRegister(app, name, handler, tc.opts...)
				case "test":
					appsdk.MustRegisterTest(app, name, handler, tc.opts...)
				case "extension":
					opts := append([]appsdk.FunctionOption{appsdk.Handle(handler)}, tc.opts...)
					if err := app.Use(extension.New("sample").ExtensionFunc(name, opts...)); err != nil {
						t.Fatal(err)
					}
					name = "extension.sample." + name
				}
				for _, method := range []string{appsdk.MethodGetFunctions, appsdk.MethodGetTestFunctions} {
					res := app.HandleRequest(context.Background(), appsdk.FunctionRequest{Method: method})
					if res.Error != nil {
						t.Fatalf("discovery failed: %+v", res.Error)
					}
					var discovery struct {
						Functions []map[string]any `json:"functions"`
					}
					if err := json.Unmarshal(res.Result, &discovery); err != nil {
						t.Fatal(err)
					}
					visible := !tc.hidden && (mode == "test") == (method == appsdk.MethodGetTestFunctions)
					if !visible {
						if len(discovery.Functions) != 0 {
							t.Fatalf("unexpected discovery: %+v", discovery.Functions)
						}
						continue
					}
					if len(discovery.Functions) != 1 || discovery.Functions[0]["name"] != name {
						t.Fatalf("unexpected discovery: %+v", discovery.Functions)
					}
					value, present := discovery.Functions[0]["deprecated"]
					if present != tc.present || (present && value != tc.value) {
						t.Fatalf("deprecated = %v (present %v), want %v (present %v)", value, present, tc.value, tc.present)
					}
				}
				res := app.HandleRequest(context.Background(), appsdk.FunctionRequest{Method: name, Params: json.RawMessage(`{"message":"still callable"}`)})
				if res.Error != nil {
					t.Fatalf("call failed: %+v", res.Error)
				}
				var out echoOutput
				if err := json.Unmarshal(res.Result, &out); err != nil {
					t.Fatal(err)
				}
				if out.Message != "still callable" {
					t.Fatalf("unexpected handler result: %+v", out)
				}
			})
		}
	}
}

func TestAppExtensionRegistrationTargets(t *testing.T) {
	app := appsdk.New(appsdk.Options{AppID: "app"})
	if targets := app.AutoRegisterTargets(); len(targets) != 1 ||
		targets[0].Name != appsdk.CoreExtensionName ||
		targets[0].SystemVersion != appsdk.DefaultSystemVersion {
		t.Fatalf("unexpected fallback targets: %+v", targets)
	}

	if err := app.DeclareExtension("wms", "v1"); err != nil {
		t.Fatal(err)
	}
	if err := app.DeclareExtension("wms", "v1"); err != nil {
		t.Fatal(err)
	}
	targets := app.AutoRegisterTargets()
	if len(targets) != 1 || targets[0].Name != "wms" || targets[0].SystemVersion != "v1" {
		t.Fatalf("unexpected targets: %+v", targets)
	}
}

func TestHandleValidatesInput(t *testing.T) {
	app := appsdk.New(appsdk.Options{})
	app.Func(
		"extension.test.validate",
		appsdk.Handle(func(_ context.Context, _ appsdk.Context, in *validatedInput) (*echoOutput, error) {
			return &echoOutput{Message: in.Message}, nil
		}),
	)

	res := app.HandleRequest(context.Background(), appsdk.FunctionRequest{
		Method: "extension.test.validate",
		Params: json.RawMessage(`{}`),
	})
	if res.Error == nil {
		t.Fatal("expected validation error")
	}
	if res.Error.Code != appsdk.CodeBadRequest {
		t.Fatalf("expected bad request, got %+v", res.Error)
	}
}

func TestHandleInputSupportsDynamicOutput(t *testing.T) {
	app := appsdk.New(appsdk.Options{})
	app.Func(
		"extension.test.dynamic",
		appsdk.HandleInput(func(_ context.Context, _ appsdk.Context, in *echoInput) (any, error) {
			return map[string]string{"message": in.Message}, nil
		}),
	)

	res := app.HandleRequest(context.Background(), appsdk.FunctionRequest{
		Method: "extension.test.dynamic",
		Params: json.RawMessage(`{"message":"ok"}`),
	})
	if res.Error != nil {
		t.Fatalf("unexpected error: %+v", res.Error)
	}

	var got map[string]string
	if err := json.Unmarshal(res.Result, &got); err != nil {
		t.Fatal(err)
	}
	if got["message"] != "ok" {
		t.Fatalf("expected dynamic output, got %#v", got)
	}
}

func TestRegisterProtoInputSupportsDynamicOutput(t *testing.T) {
	app := appsdk.New(appsdk.Options{})
	appsdk.MustRegisterProtoInput(
		app,
		"extension.test.protoInput",
		func(_ context.Context, _ appsdk.Context, in *sdkv1.WmsGetOrderRequest) (any, error) {
			return map[string]string{"commerceOrderId": in.GetCommerceOrderId()}, nil
		},
	)

	res := app.HandleRequest(context.Background(), appsdk.FunctionRequest{
		Method: "extension.test.protoInput",
		Params: json.RawMessage(`{"commerceOrderId":"commerce-order-1"}`),
	})
	if res.Error != nil {
		t.Fatalf("unexpected error: %+v", res.Error)
	}

	var got map[string]string
	if err := json.Unmarshal(res.Result, &got); err != nil {
		t.Fatal(err)
	}
	if got["commerceOrderId"] != "commerce-order-1" {
		t.Fatalf("expected dynamic output from proto input, got %#v", got)
	}

	schema := app.Schemas()[0].InputSchema
	properties := schema["properties"].(map[string]any)
	if _, ok := properties["commerceOrderId"]; !ok {
		t.Fatalf("expected proto JSON field in schema, got %#v", properties)
	}
}

func TestProtoInputSupportsExtensibleSDKOutput(t *testing.T) {
	app := appsdk.New(appsdk.Options{})
	appsdk.MustRegisterProtoInput(
		app,
		"extension.test.extensible",
		func(_ context.Context, _ appsdk.Context, in *sdkv1.WmsGetOrderRequest) (any, error) {
			return appsdk.WithExtraFields(
				&sdkv1.WmsSuccessResult{Success: true, Message: in.GetOrderId()},
				appsdk.ExtraFields{"shopId": "shop-1"},
			), nil
		},
		appsdk.ExtensibleOutput[sdkv1.WmsSuccessResult](),
	)

	res := app.HandleRequest(context.Background(), appsdk.FunctionRequest{
		Method: "extension.test.extensible",
		Params: json.RawMessage(`{"orderId":"order-1"}`),
	})
	if res.Error != nil {
		t.Fatalf("unexpected error: %+v", res.Error)
	}

	var got map[string]any
	if err := json.Unmarshal(res.Result, &got); err != nil {
		t.Fatal(err)
	}
	if got["success"] != true || got["message"] != "order-1" || got["shopId"] != "shop-1" {
		t.Fatalf("expected SDK output plus app extra field, got %#v", got)
	}

	outputSchema := app.Schemas()[0].OutputSchema
	if outputSchema["additionalProperties"] != true {
		t.Fatalf("expected extensible output schema, got %#v", outputSchema)
	}
	properties := outputSchema["properties"].(map[string]any)
	if _, ok := properties["success"]; !ok {
		t.Fatalf("expected SDK output properties to remain, got %#v", properties)
	}
}

func TestExtensibleOutputCanDeclareExtraFields(t *testing.T) {
	app := appsdk.New(appsdk.Options{})
	appsdk.MustRegisterProtoInput(
		app,
		"extension.test.extensibleSchema",
		func(_ context.Context, _ appsdk.Context, _ *sdkv1.WmsGetOrderRequest) (any, error) {
			return appsdk.WithExtraFields(
				&sdkv1.WmsSuccessResult{Success: true},
				appsdk.ExtraFields{"shopId": "shop-1"},
			), nil
		},
		appsdk.ExtensibleOutput[sdkv1.WmsSuccessResult](
			schema.Property("shopId", map[string]any{"type": "string"}),
		),
	)

	outputSchema := app.Schemas()[0].OutputSchema
	properties := outputSchema["properties"].(map[string]any)
	if properties["shopId"].(map[string]any)["type"] != "string" {
		t.Fatalf("expected declared extra field in schema, got %#v", properties)
	}
}

func TestPatchOutputSchemaCanExtendNestedObject(t *testing.T) {
	app := appsdk.New(appsdk.Options{})
	appsdk.MustRegisterProtoInput(
		app,
		"extension.test.patchOutput",
		func(_ context.Context, _ appsdk.Context, _ *sdkv1.WmsGetOrdersRequest) (any, error) {
			return &sdkv1.WmsGetOrdersResult{}, nil
		},
		appsdk.Output[sdkv1.WmsGetOrdersResult](),
		appsdk.PatchOutputSchema(schema.ExtendObjectAt(
			"orders[]",
			schema.Property("shopId", map[string]any{"type": "string"}),
		)),
	)

	outputSchema := app.Schemas()[0].OutputSchema
	orders := outputSchema["properties"].(map[string]any)["orders"].(map[string]any)
	item := orders["items"].(map[string]any)
	properties := item["properties"].(map[string]any)
	if properties["shopId"].(map[string]any)["type"] != "string" {
		t.Fatalf("expected nested extra field in schema, got %#v", properties)
	}
}

func TestWithExtraFieldsRejectsSDKFieldConflict(t *testing.T) {
	output := appsdk.WithExtraFields(
		&echoOutput{Message: "base"},
		appsdk.ExtraFields{"message": "extra"},
	)

	if _, err := output.MarshalSDKResult(); err == nil {
		t.Fatal("expected conflict error")
	}
}

func TestWithExtraFieldsRejectsProtoDefaultFieldConflict(t *testing.T) {
	output := appsdk.WithExtraFields(
		&sdkv1.WmsSuccessResult{},
		appsdk.ExtraFields{"success": true},
	)

	if _, err := output.MarshalSDKResult(); err == nil {
		t.Fatal("expected conflict error for proto field omitted from JSON")
	}
}

func TestAppErrorMapper(t *testing.T) {
	app := appsdk.New(appsdk.Options{
		ErrorMapper: func(error) error {
			return appsdk.NewError(appsdk.CodeUnauthorized, "mapped", "mapped")
		},
	})
	app.Func(
		"extension.test.mapped",
		appsdk.Handle(func(_ context.Context, _ appsdk.Context, _ *echoInput) (*echoOutput, error) {
			return nil, errors.New("raw")
		}),
	)

	res := app.HandleRequest(context.Background(), appsdk.FunctionRequest{Method: "extension.test.mapped"})
	if res.Error == nil {
		t.Fatal("expected mapped error")
	}
	if res.Error.Code != appsdk.CodeUnauthorized || res.Error.Type != "mapped" {
		t.Fatalf("expected mapped error, got %+v", res.Error)
	}
}

func TestFunctionErrorResponseMatchesTypescriptShape(t *testing.T) {
	res := appsdk.ErrorResponse(appsdk.NewError(
		appsdk.CodeBadRequest,
		"invalidParams",
		"invalid params",
		map[string]any{"field": "orderId"},
	))

	body, err := json.Marshal(res)
	if err != nil {
		t.Fatal(err)
	}

	var got map[string]any
	if err := json.Unmarshal(body, &got); err != nil {
		t.Fatal(err)
	}

	errBody, ok := got["error"].(map[string]any)
	if !ok {
		t.Fatalf("expected error object, got %s", body)
	}
	if errBody["code"] != float64(appsdk.CodeBadRequest) {
		t.Fatalf("expected code %d, got %#v", appsdk.CodeBadRequest, errBody["code"])
	}
	if errBody["message"] != "invalid params" {
		t.Fatalf("expected message, got %#v", errBody["message"])
	}
	if errBody["type"] != "invalidParams" {
		t.Fatalf("expected type, got %#v", errBody["type"])
	}
	data, ok := errBody["data"].(map[string]any)
	if !ok || data["field"] != "orderId" {
		t.Fatalf("expected structured data, got %#v", errBody["data"])
	}
}
