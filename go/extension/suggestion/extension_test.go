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
			if _, exists := result["benefitText"]; exists {
				t.Fatalf("legacy response unexpectedly includes benefitText: %s", response.Result)
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

func TestStaticMetadataRejectsMissingTriggers(t *testing.T) {
	for _, metadata := range []*GetTriggersResponse{nil, {BenefitText: map[string]string{"en": "hello"}}} {
		if _, err := StaticMetadata(metadata)(context.Background(), appsdk.Context{}, &GetTriggersRequest{}); err == nil {
			t.Fatal("expected missing triggers error")
		}
	}
}

func TestExtensionSerializesBenefitText(t *testing.T) {
	for _, benefit := range []map[string]string{nil, {}, {"ko": "채널톡 알림을 받아볼 수 있어요.", "en": "you can receive notifications."}} {
		triggers, err := NewTriggers(nil, nil)
		if err != nil {
			t.Fatal(err)
		}
		app := appsdk.New(appsdk.Options{})
		if err := Extension().GetTriggers(StaticMetadata(&GetTriggersResponse{
			Triggers: triggers, BenefitText: benefit,
		})).Register(app); err != nil {
			t.Fatal(err)
		}
		response := app.HandleRequest(context.Background(), appsdk.FunctionRequest{Method: FunctionGetTriggers})
		if response.IsError() {
			t.Fatal(response.Error)
		}
		var result struct {
			Triggers struct {
				Urls     []string            `json:"urls"`
				Keywords map[string][]string `json:"keywords"`
			} `json:"triggers"`
			BenefitText map[string]string `json:"benefitText"`
		}
		if err := json.Unmarshal(response.Result, &result); err != nil {
			t.Fatal(err)
		}
		if result.Triggers.Urls == nil || result.Triggers.Keywords == nil {
			t.Fatalf("required collections missing: %s", response.Result)
		}
		if len(result.BenefitText) != len(benefit) {
			t.Fatalf("benefitText = %v", result.BenefitText)
		}
		for locale, text := range benefit {
			if result.BenefitText[locale] != text {
				t.Fatalf("benefitText[%q] = %q", locale, result.BenefitText[locale])
			}
		}
	}
}
