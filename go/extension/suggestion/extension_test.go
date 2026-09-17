package suggestion

import (
	"context"
	"encoding/json"
	"testing"

	"github.com/channel-io/app-sdk/go/appsdk"
)

func TestNewTriggersAndStaticHandler(t *testing.T) {
	triggers, err := NewTriggers(
		[]string{"https://shopify.com/"},
		map[string][]string{"ko": {"쇼피파이"}, "en": {"shopify"}},
	)
	if err != nil {
		t.Fatalf("NewTriggers() error = %v", err)
	}

	response, err := StaticTriggers(triggers)(
		context.Background(),
		appsdk.Context{},
		&GetTriggersRequest{},
	)
	if err != nil {
		t.Fatalf("StaticTriggers() error = %v", err)
	}
	if got := response.GetTriggers().GetUrls(); len(got) != 1 || got[0] != "https://shopify.com/" {
		t.Fatalf("urls = %v", got)
	}
	if got := response.GetTriggers().GetKeywords().AsMap()["ko"]; got == nil {
		t.Fatalf("keywords[ko] missing: %v", response.GetTriggers().GetKeywords().AsMap())
	}
}

func TestStaticTriggersRejectsNil(t *testing.T) {
	response, err := StaticTriggers(nil)(
		context.Background(),
		appsdk.Context{},
		&GetTriggersRequest{},
	)
	if err == nil {
		t.Fatal("StaticTriggers(nil) error = nil")
	}
	if response != nil {
		t.Fatalf("StaticTriggers(nil) response = %v", response)
	}
}

func TestExtensionRegistersGetTriggers(t *testing.T) {
	app := appsdk.New(appsdk.Options{})
	triggers, err := NewTriggers(nil, nil)
	if err != nil {
		t.Fatalf("NewTriggers() error = %v", err)
	}
	if err := Extension().GetTriggers(StaticTriggers(triggers)).Register(app); err != nil {
		t.Fatalf("Register() error = %v", err)
	}

	if !app.HasMethod(FunctionGetTriggers) {
		t.Fatalf("function %q was not registered", FunctionGetTriggers)
	}
}

func TestExtensionSerializesRequiredTriggerCollections(t *testing.T) {
	tests := []struct {
		name         string
		keywords     map[string][]string
		wantKeywords int
	}{
		{name: "empty snapshot"},
		{name: "keyword only", keywords: map[string][]string{"en": {"shopify"}}, wantKeywords: 1},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			triggers, err := NewTriggers(nil, tt.keywords)
			if err != nil {
				t.Fatalf("NewTriggers() error = %v", err)
			}
			app := appsdk.New(appsdk.Options{})
			if err := Extension().GetTriggers(StaticTriggers(triggers)).Register(app); err != nil {
				t.Fatalf("Register() error = %v", err)
			}

			response := app.HandleRequest(context.Background(), appsdk.FunctionRequest{
				Method: FunctionGetTriggers,
			})
			if response.IsError() {
				t.Fatalf("HandleRequest() error = %v", response.Error)
			}

			var result map[string]any
			if err := json.Unmarshal(response.Result, &result); err != nil {
				t.Fatalf("Unmarshal() error = %v", err)
			}
			serializedTriggers, ok := result["triggers"].(map[string]any)
			if !ok {
				t.Fatalf("triggers = %#v", result["triggers"])
			}
			urls, ok := serializedTriggers["urls"].([]any)
			if !ok || len(urls) != 0 {
				t.Fatalf("urls = %#v", serializedTriggers["urls"])
			}
			keywords, ok := serializedTriggers["keywords"].(map[string]any)
			if !ok || len(keywords) != tt.wantKeywords {
				t.Fatalf("keywords = %#v", serializedTriggers["keywords"])
			}
		})
	}
}
