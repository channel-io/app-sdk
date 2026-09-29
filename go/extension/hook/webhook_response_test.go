package hook

import (
	"context"
	"strings"
	"testing"

	"github.com/channel-io/app-sdk/go/appsdk"
	"google.golang.org/protobuf/encoding/protojson"
	"google.golang.org/protobuf/proto"
)

func TestFixedWebhookResponse(t *testing.T) {
	for _, scope := range []string{WebhookExecutionScopeApp, WebhookExecutionScopeManager} {
		t.Run(scope, func(t *testing.T) {
			response := &WebhookResponse{StatusCode: 200, ContentType: "application/xml; charset=utf-8", Body: "<result>OK</result>\n"}
			config := &Config{Type: TypeWebhookReceived, ActionFunctionName: "hooks.receive", TargetId: "orders", Webhook: &WebhookConfig{ExecutionScope: scope, Response: response}}
			if scope == WebhookExecutionScopeApp {
				config.Webhook.EndpointToken = strings.Repeat("a", 32)
			}
			result, err := StaticHooks(config)(context.Background(), appsdk.Context{}, &GetHooksRequest{})
			if err != nil {
				t.Fatal(err)
			}
			encoded, err := protojson.Marshal(result)
			if err != nil {
				t.Fatal(err)
			}
			var decoded GetHooksResponse
			if err := protojson.Unmarshal(encoded, &decoded); err != nil {
				t.Fatal(err)
			}
			if !proto.Equal(response, decoded.Hooks[0].Webhook.Response) {
				t.Fatal("fixed response did not survive serialization")
			}
		})
	}
	for _, tc := range []struct {
		name     string
		response *WebhookResponse
		valid    bool
	}{
		{"absent", nil, true},
		{"empty 204", &WebhookResponse{StatusCode: 204, ContentType: "text/plain"}, true},
		{"empty 205", &WebhookResponse{StatusCode: 205, ContentType: "text/plain"}, true},
		{"boundary", &WebhookResponse{StatusCode: 299, ContentType: "text/plain", Body: strings.Repeat("a", 65536)}, true},
		{"missing", &WebhookResponse{}, false},
		{"error status", &WebhookResponse{StatusCode: 400, ContentType: "text/plain"}, false},
		{"invalid MIME", &WebhookResponse{StatusCode: 200, ContentType: "invalid"}, false},
		{"newline", &WebhookResponse{StatusCode: 200, ContentType: "text/plain\r\nX-Test: injected"}, false},
		{"header control", &WebhookResponse{StatusCode: 200, ContentType: "text/plain; x=\"\x00\""}, false},
		{"conflicting parameters", &WebhookResponse{StatusCode: 200, ContentType: "text/plain; charset=utf-8; charset=ascii"}, false},
		{"204 body", &WebhookResponse{StatusCode: 204, ContentType: "text/plain", Body: "x"}, false},
		{"205 body", &WebhookResponse{StatusCode: 205, ContentType: "text/plain", Body: "x"}, false},
		{"byte limit", &WebhookResponse{StatusCode: 200, ContentType: "text/plain", Body: strings.Repeat("한", 21846)}, false},
	} {
		t.Run(tc.name, func(t *testing.T) {
			_, err := StaticHooks(&Config{Type: TypeWebhookReceived, Webhook: &WebhookConfig{Response: tc.response}})(context.Background(), appsdk.Context{}, &GetHooksRequest{})
			if (err == nil) != tc.valid {
				t.Fatalf("valid=%v err=%v", tc.valid, err)
			}
		})
	}
}
