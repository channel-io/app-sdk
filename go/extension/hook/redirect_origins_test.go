package hook

import (
	"context"
	"encoding/json"
	"errors"
	"strings"
	"testing"

	"github.com/channel-io/app-sdk/go/appsdk"
)

func callGetHooks(t *testing.T, handler appsdk.TypedHandlerFunc[GetHooksRequest, GetHooksResponse]) (appsdk.FunctionResponse, appsdk.FunctionSchema) {
	t.Helper()
	app := appsdk.New(appsdk.Options{AppID: "app-1"})
	if err := app.Use(Extension().GetHooks(handler)); err != nil {
		t.Fatal(err)
	}
	response := app.HandleRequest(context.Background(), appsdk.FunctionRequest{Method: FunctionGetHooks})
	return response, app.Schemas()[0]
}

func TestContinueOnlyOAuthHookWireMatchesRequiredSchemaFields(t *testing.T) {
	for _, kind := range []string{TypeOAuthBeforeAuthorization, TypeOAuthAfterAuthorization} {
		t.Run(kind, func(t *testing.T) {
			response, schema := callGetHooks(t, StaticHooks(&Config{Type: kind, ActionFunctionName: "hooks.oauth.flow", RedirectOrigins: []string{}}))
			if response.Error != nil {
				t.Fatal(response.Error)
			}
			var output struct {
				Hooks []map[string]json.RawMessage `json:"hooks"`
			}
			if err := json.Unmarshal(response.Result, &output); err != nil || len(output.Hooks) != 1 {
				t.Fatalf("unexpected output: %s, %v", response.Result, err)
			}
			if _, exists := output.Hooks[0]["redirectOrigins"]; exists {
				t.Fatal("empty repeated fields should keep their existing proto JSON omission")
			}
			items := schema.OutputSchema["properties"].(map[string]any)["hooks"].(map[string]any)["items"].(map[string]any)
			found := false
			for _, candidate := range items["anyOf"].([]any) {
				branch := candidate.(map[string]any)
				if branch["properties"].(map[string]any)["type"].(map[string]any)["const"] != kind {
					continue
				}
				found = true
				for _, required := range branch["required"].([]any) {
					if _, exists := output.Hooks[0][required.(string)]; !exists {
						t.Errorf("getHooks wire omits advertised required field %q", required)
					}
				}
			}
			if !found {
				t.Fatal("OAuth hook schema branch not found")
			}
		})
	}
}

func TestOAuthRedirectOriginValidationOnStaticAndDynamicHooks(t *testing.T) {
	tests := []struct {
		origin string
		valid  bool
	}{
		{"https://provider.example", true},
		{"https://provider.example:8443", true},
		{"https://127.0.0.1:8443", true},
		{"https://[2001:db8::1]:8443", true},
		{"https://[::ffff:7f00:1]", true},
		{"https://xn--bcher-kva.example", true},
		{"http://provider.example", false},
		{"https://EXAMPLE.com", false},
		{"https://example.com:443", false},
		{"https://example.com:08443", false},
		{"https://example.com:65536", false},
		{"https://example.com:", false},
		{"https://*.example.com", false},
		{"https://provider^example.com", false},
		{"https://provider|example.com", false},
		{"https://user:secret@provider.example", false},
		{"https://provider.example/", false},
		{"https://provider.example/path", false},
		{"https://provider.example?next=1", false},
		{"https://provider.example#fragment", false},
		{"https://provider.example\\path", false},
		{" https://provider.example", false},
		{"https://bücher.example", false},
		{"https://127.1", false},
		{"https://0x", false},
		{"https://0xfffffffff", false},
		{"https://[2001:0db8::1]", false},
		{"https://2001:db8::1", false},
		{"https://[::ffff:127.0.0.1]", false},
	}
	for _, kind := range []string{TypeOAuthBeforeAuthorization, TypeOAuthAfterAuthorization} {
		for _, tt := range tests {
			t.Run(kind+"/"+tt.origin, func(t *testing.T) {
				config := &Config{Type: kind, ActionFunctionName: "hooks.oauth.flow", RedirectOrigins: []string{tt.origin}}
				_, staticErr := StaticHooks(config)(context.Background(), appsdk.Context{}, &GetHooksRequest{})
				if (staticErr == nil) != tt.valid {
					t.Errorf("StaticHooks error=%v, valid=%v", staticErr, tt.valid)
				}
				response, _ := callGetHooks(t, func(context.Context, appsdk.Context, *GetHooksRequest) (*GetHooksResponse, error) {
					return &GetHooksResponse{Hooks: []*Config{config}}, nil
				})
				if (response.Error == nil) != tt.valid {
					t.Errorf("GetHooks error=%v, valid=%v", response.Error, tt.valid)
				}
			})
		}
	}
}

func TestOAuthOriginValidationPreservesExistingHookResponses(t *testing.T) {
	for _, handler := range []appsdk.TypedHandlerFunc[GetHooksRequest, GetHooksResponse]{
		StaticHooks(),
		func(context.Context, appsdk.Context, *GetHooksRequest) (*GetHooksResponse, error) { return nil, nil },
	} {
		response, _ := callGetHooks(t, handler)
		if response.Error != nil || string(response.Result) != "{}" {
			t.Fatalf("empty hooks changed: %#v", response)
		}
	}
	response, _ := callGetHooks(t, StaticHooks(&Config{Type: TypeAppInstalled, ActionFunctionName: "hooks.installed"}))
	if response.Error != nil {
		t.Fatal(response.Error)
	}
	wantErr := errors.New("handler failed")
	response, _ = callGetHooks(t, func(context.Context, appsdk.Context, *GetHooksRequest) (*GetHooksResponse, error) {
		return nil, wantErr
	})
	if response.Error == nil || response.Error.Message != "internal error" {
		t.Fatalf("handler error changed: %#v", response.Error)
	}
}

func TestNonOAuthFlowHooksRejectNonemptyRedirectOrigins(t *testing.T) {
	for _, kind := range []string{TypeAppInstalled, "oauth.connected", TypeWebhookReceived} {
		for _, origins := range [][]string{nil, {}, {"https://provider.example"}} {
			t.Run(kind+"/"+strings.Join(origins, ","), func(t *testing.T) {
				config := &Config{Type: kind, ActionFunctionName: "hooks.handle", RedirectOrigins: origins}
				wantError := len(origins) > 0
				_, err := StaticHooks(config)(context.Background(), appsdk.Context{}, &GetHooksRequest{})
				if (err != nil) != wantError {
					t.Errorf("StaticHooks error=%v, wantError=%v", err, wantError)
				}
				response, _ := callGetHooks(t, func(context.Context, appsdk.Context, *GetHooksRequest) (*GetHooksResponse, error) {
					return &GetHooksResponse{Hooks: []*Config{config}}, nil
				})
				if (response.Error != nil) != wantError {
					t.Errorf("GetHooks error=%v, wantError=%v", response.Error, wantError)
				}
			})
		}
	}
}
