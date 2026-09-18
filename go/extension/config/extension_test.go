package config_test

import (
	"context"
	"encoding/json"
	"reflect"
	"testing"

	"github.com/channel-io/app-sdk/go/appsdk"
	"github.com/channel-io/app-sdk/go/extension/config"
	"google.golang.org/protobuf/encoding/protojson"
	"google.golang.org/protobuf/proto"
)

func TestActionRedirectJSONContract(t *testing.T) {
	block := &config.Block{
		Type: config.BlockTypeAction, Label: "Connect", FunctionName: "commerce.connect",
		RedirectOrigins: []string{"https://connect.example.com"},
	}
	result := &config.ActionResult{Redirect: &config.ActionRedirect{
		Url: "https://connect.example.com/start?channelId=1", Mode: "currentTab",
	}}
	for _, test := range []struct {
		value proto.Message
		want  string
	}{
		{block, `{"type":"action","label":"Connect","functionName":"commerce.connect","redirectOrigins":["https://connect.example.com"]}`},
		{result, `{"redirect":{"url":"https://connect.example.com/start?channelId=1","mode":"currentTab"}}`},
		{&config.ActionResult{Message: "Done"}, `{"message":"Done"}`},
	} {
		raw, err := protojson.Marshal(test.value)
		if err != nil {
			t.Fatal(err)
		}
		var got, want any
		if err := json.Unmarshal(raw, &got); err != nil {
			t.Fatal(err)
		}
		if err := json.Unmarshal([]byte(test.want), &want); err != nil {
			t.Fatal(err)
		}
		if !reflect.DeepEqual(got, want) {
			t.Fatalf("got %s, want %s", raw, test.want)
		}
	}
}

func TestExtensionRegistersConfigSchema(t *testing.T) {
	app := appsdk.New(appsdk.Options{AppID: "app"})
	if err := app.Use(config.Extension().
		GetConfigSchema(config.StaticSchema(&config.GetConfigSchemaResponse{
			SchemaVersion: "v1",
			ConfigScope:   config.ScopeChannel,
			ProviderName:  "Provider",
			Blocks: []*config.Block{{
				Type:         "text",
				Key:          "storeId",
				Label:        "Store ID",
				Required:     true,
				StorageClass: config.StorageClassConfig,
			}},
		})).
		ValidateStoredConfig(func(context.Context, appsdk.Context, *config.ValidateStoredConfigRequest) (*config.ValidateStoredConfigResponse, error) {
			return config.Valid(), nil
		}),
	); err != nil {
		t.Fatal(err)
	}

	res := app.HandleRequest(context.Background(), appsdk.FunctionRequest{Method: config.FunctionGetConfigSchema})
	if res.Error != nil {
		t.Fatalf("unexpected error: %+v", res.Error)
	}
	var out config.GetConfigSchemaResponse
	if err := protojson.Unmarshal(res.Result, &out); err != nil {
		t.Fatal(err)
	}
	if out.ProviderName != "Provider" || len(out.Blocks) != 1 {
		t.Fatalf("unexpected schema: providerName=%q blocks=%d", out.GetProviderName(), len(out.GetBlocks()))
	}
}

func TestCredentialsFromPrefersConfigStringsOverLegacyAPICredentials(t *testing.T) {
	got := config.CredentialsFrom(appsdk.Context{
		APICredentials: map[string]string{
			"apiKey": "legacy",
			"domain": "legacy-domain",
		},
		Config: map[string]any{
			"domain": "config-domain",
			"count":  1,
		},
	})

	if got["apiKey"] != "legacy" {
		t.Fatalf("expected legacy-only credential to remain, got %#v", got)
	}
	if got["domain"] != "config-domain" {
		t.Fatalf("expected config string to override legacy value, got %#v", got)
	}
	if _, ok := got["count"]; ok {
		t.Fatalf("expected non-string config value to be omitted, got %#v", got)
	}
}
