package store

import (
	"context"
	"testing"

	"github.com/channel-io/app-sdk/go/appsdk"
)

func TestStaticProfilePreservesEmptyExtensionValuesForGUIFallback(t *testing.T) {
	empty := &LocalizedContent{
		Images: []*Image{},
		Intro: &Intro{
			HelpsWith:      "",
			RecommendedFor: "   ",
		},
		Faqs: []*FAQ{},
	}
	profile := &Profile{
		RelatedAppIds: []string{},
		I18NMap: map[string]*LocalizedContent{
			"fr": empty,
		},
	}

	response, err := StaticProfile(profile)(context.Background(), appsdk.Context{}, &GetStoreProfileRequest{})
	if err != nil {
		t.Fatalf("StaticProfile returned an error: %v", err)
	}
	if response != profile {
		t.Fatal("StaticProfile did not preserve the extension profile")
	}
	if got := response.GetI18NMap()["fr"].GetIntro().GetRecommendedFor(); got != "   " {
		t.Fatalf("expected whitespace-only fallback marker to be preserved, got %q", got)
	}
}
