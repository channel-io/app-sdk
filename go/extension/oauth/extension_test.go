package oauth

import (
	"encoding/json"
	"testing"

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
			AdditionalParamsByAuthScope: &AuthorizationParamsByAuthScope{
				Channel: map[string]string{"actor": "app"},
				Manager: map[string]string{"actor": "user"},
			},
		},
	}
	encoded, err := protojson.Marshal(config)
	if err != nil {
		t.Fatal(err)
	}
	var wire struct {
		Provider struct {
			Request struct {
				Method string `json:"codeChallengeMethod"`
			} `json:"authorizationRequest"`
			Params map[string]map[string]string `json:"additionalParamsByAuthScope"`
		} `json:"oauthProvider"`
	}
	if err := json.Unmarshal(encoded, &wire); err != nil {
		t.Fatal(err)
	}
	request := wire.Provider.Request
	if request.Method != "S256" || wire.Provider.Params["channel"]["actor"] != "app" || wire.Provider.Params["manager"]["actor"] != "user" {
		t.Fatalf("unexpected authorization request JSON: %s", encoded)
	}
	var decoded AuthConfig
	if err := protojson.Unmarshal(encoded, &decoded); err != nil || !proto.Equal(config, &decoded) {
		t.Fatalf("authorization request round trip failed: %v", err)
	}
}
