package suggestion

import (
	"context"
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
