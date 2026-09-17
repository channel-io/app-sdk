package native

import (
	"encoding/json"
	"testing"

	sdkv1 "github.com/channel-io/app-sdk/go/internal/gen/channel/app/sdk/v1"
	"google.golang.org/protobuf/encoding/protojson"
	"google.golang.org/protobuf/proto"
)

func TestOAuthFlowWireContract(t *testing.T) {
	result := OAuthFlowResult{Flow: &OAuthFlow{
		ID:               "flow-1",
		Phase:            "after",
		ExpiresAt:        "2026-09-17T12:00:00Z",
		AuthorizationURL: proto.String("https://setup.example/consent"),
		CanResume:        proto.Bool(false),
	}}
	wire, err := json.Marshal(result)
	if err != nil {
		t.Fatal(err)
	}
	var generated sdkv1.OAuthFlowResult
	if err := protojson.Unmarshal(wire, &generated); err != nil {
		t.Fatal(err)
	}
	if generated.GetFlow().GetAuthorizationUrl() != *result.Flow.AuthorizationURL {
		t.Fatalf("authorizationURL did not round trip: %s", wire)
	}
	if generated.GetFlow().Key != nil || generated.GetFlow().TargetAuthScope != nil {
		t.Fatal("absent optional fields must retain absence")
	}
	if generated.GetFlow().CanResume == nil || generated.GetFlow().GetCanResume() {
		t.Fatal("explicit read-only flow state must retain false")
	}

	requestWire, err := json.Marshal(ResumeOAuthFlowParams{FlowID: "flow-1", ResumeNonce: proto.String("nonce")})
	if err != nil {
		t.Fatal(err)
	}
	var request sdkv1.ResumeOAuthFlowParams
	if err := protojson.Unmarshal(requestWire, &request); err != nil {
		t.Fatal(err)
	}
	if request.GetFlowId() != "flow-1" || request.GetResumeNonce() != "nonce" {
		t.Fatalf("resume parameters did not round trip: %s", requestWire)
	}
}
