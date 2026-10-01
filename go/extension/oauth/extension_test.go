package oauth

import (
	"bytes"
	"encoding/json"
	"regexp"
	"testing"

	"github.com/channel-io/app-sdk/go/appsdk"
	"github.com/channel-io/app-sdk/go/extension/schemaregistry"

	"google.golang.org/protobuf/encoding/protojson"
	"google.golang.org/protobuf/proto"
)

func TestAuthConfigPreservesChannelFallbackPresence(t *testing.T) {
	for _, tc := range []struct {
		name  string
		value *bool
	}{
		{"omitted", nil}, {"enabled", proto.Bool(true)}, {"disabled", proto.Bool(false)},
	} {
		t.Run(tc.name, func(t *testing.T) {
			config := &AuthConfig{AuthType: AuthTypeOAuth, AuthScope: ScopeCaller, AllowChannelFallback: tc.value}
			encoded, err := protojson.Marshal(config)
			if err != nil {
				t.Fatal(err)
			}
			var fields map[string]any
			if err := json.Unmarshal(encoded, &fields); err != nil {
				t.Fatal(err)
			}
			value, present := fields["allowChannelFallback"]
			if present != (tc.value != nil) || (present && value != *tc.value) {
				t.Fatalf("unexpected allowChannelFallback presence/value: %s", encoded)
			}
			var decoded AuthConfig
			if err := protojson.Unmarshal(encoded, &decoded); err != nil || !proto.Equal(config, &decoded) {
				t.Fatalf("round trip lost optional fallback: %v", err)
			}
		})
	}
}

func TestAuthConfigPreservesScopeAuthorizationParams(t *testing.T) {
	config := &AuthConfig{
		AuthType:  AuthTypeOAuth,
		AuthScope: ScopeCaller,
		OauthProvider: &Provider{
			AuthorizationRequest: &AuthorizationRequestMapping{
				CodeChallengeMethod: proto.String("S256"),
			},
			AdditionalParams:       map[string]string{"prompt": "consent"},
			ScopedAdditionalParams: map[string]*ScopedParamValue{"actor": {Channel: proto.String("app"), Manager: proto.String("user")}},
		},
	}

	// Field 10 retains its published string-map wire format.
	binary, err := proto.Marshal(config)
	if err != nil {
		t.Fatal(err)
	}
	var decoded AuthConfig
	if err := proto.Unmarshal(binary, &decoded); err != nil || !proto.Equal(config, &decoded) {
		t.Fatalf("binary round trip: %v", err)
	}
	app := appsdk.New(appsdk.Options{AppID: "app"})
	if err := app.Use(Extension().GetAuthConfig(StaticAuthConfig(config))); err != nil {
		t.Fatal(err)
	}
	result := app.HandleRequest(t.Context(), appsdk.FunctionRequest{Method: FunctionGetAuthConfig, Params: json.RawMessage(`{}`)})
	if result.Error != nil {
		t.Fatalf("handler: %+v", result.Error)
	}
	encoded := result.Result
	var wire map[string]any
	if err := json.Unmarshal(encoded, &wire); err != nil {
		t.Fatal(err)
	}
	provider := wire["oauthProvider"].(map[string]any)
	params := provider["additionalParams"].(map[string]any)
	actor := params["actor"].(map[string]any)
	if params["prompt"] != "consent" || actor["channel"] != "app" || actor["manager"] != "user" {
		t.Fatalf("unexpected JSON: %s", encoded)
	}
	if _, exists := provider["scopedAdditionalParams"]; exists {
		t.Fatal("internal representation leaked")
	}
	if !proto.Equal(config, &decoded) {
		t.Fatal("projection mutated config")
	}
	config.OauthProvider.AdditionalParams["actor"] = "duplicate"
	if _, err := marshalAuthConfig(config); err == nil {
		t.Fatal("ambiguous value accepted")
	}
}

func TestLegacyAdditionalParamsBinaryAndJSONStayCompatible(t *testing.T) {
	provider := &Provider{AdditionalParams: map[string]string{"prompt": "consent"}}
	encoded, err := proto.Marshal(provider)
	if err != nil {
		t.Fatal(err)
	}
	// OAuthProvider field 10: map entry key=prompt, string value=consent.
	expected := []byte{0x52, 17, 0x0a, 6, 'p', 'r', 'o', 'm', 'p', 't', 0x12, 7, 'c', 'o', 'n', 's', 'e', 'n', 't'}
	if !bytes.Equal(encoded, expected) {
		t.Fatalf("legacy wire changed: %x", encoded)
	}
	config := &AuthConfig{OauthProvider: provider}
	projected, err := marshalAuthConfig(config)
	if err != nil {
		t.Fatal(err)
	}
	legacy, err := protojson.Marshal(config)
	if err != nil {
		t.Fatal(err)
	}
	if !bytes.Equal(projected, legacy) {
		t.Fatal("legacy JSON changed")
	}
}

func TestOAuthRegistrationPatternsCompileInGo(t *testing.T) {
	schema, ok := schemaregistry.Schema(FunctionGetAuthConfig)
	if !ok {
		t.Fatal("missing canonical schema")
	}
	var visit func(any)
	visit = func(value any) {
		switch v := value.(type) {
		case map[string]any:
			for key, child := range v {
				if key == "pattern" {
					if _, err := regexp.Compile(child.(string)); err != nil {
						t.Errorf("pattern incompatible with Go JSON Schema: %v", err)
					}
				}
				visit(child)
			}
		case []any:
			for _, child := range v {
				visit(child)
			}
		}
	}
	visit(schema.OutputSchema)
}
