package store_test

import (
	"encoding/json"
	"reflect"
	"testing"

	"github.com/channel-io/app-sdk/go/appsdk"
	"github.com/channel-io/app-sdk/go/extension/store"
	"github.com/channel-io/app-sdk/go/testkit"
)

func TestStoreProfileSearchKeywordRegistration(t *testing.T) {
	for _, keywords := range [][]string{nil, {}, {"Slack", "슬랙"}} {
		app := appsdk.New(appsdk.Options{AppID: "app"})
		localized := &store.LocalizedContent{Images: []*store.Image{}, Intro: &store.Intro{}, Faqs: []*store.FAQ{}}
		profile := &store.Profile{RelatedAppIds: []string{}, I18NMap: map[string]*store.LocalizedContent{"ko": localized, "ja": localized, "en": localized}, SearchKeyword: keywords}
		if err := app.Use(store.Extension().GetStoreProfile(store.StaticProfile(profile))); err != nil {
			t.Fatal(err)
		}
		response := testkit.Call(t, app, store.FunctionGetStoreProfile, map[string]any{})
		if response.Error != nil {
			t.Fatalf("store response: %+v", response.Error)
		}
		var body struct {
			SearchKeyword []string `json:"searchKeyword"`
		}
		if err := json.Unmarshal(response.Result, &body); err != nil {
			t.Fatal(err)
		}
		if len(keywords) > 0 && !reflect.DeepEqual(keywords, body.SearchKeyword) {
			t.Fatalf("keywords = %v", body.SearchKeyword)
		}
	}
}
