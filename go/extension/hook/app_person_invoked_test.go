package hook

import (
	"context"
	"encoding/json"
	"testing"

	"github.com/channel-io/app-sdk/go/appsdk"
	"google.golang.org/protobuf/encoding/protojson"
	"google.golang.org/protobuf/proto"
)

func TestAppPersonInvocationMetadata(t *testing.T) {
	config := &Config{Type: TypeAppPersonInvoked, ActionFunctionName: "hooks.onInvocation", SystemVersion: "v1"}
	if _, err := StaticHooks(config)(context.Background(), appsdk.Context{}, &GetHooksRequest{}); err != nil {
		t.Fatal(err)
	}
	for _, extra := range []func(*Config){
		func(c *Config) { c.TargetId = "target" },
		func(c *Config) { c.Webhook = &WebhookConfig{ExecutionScope: WebhookExecutionScopeManager} },
		func(c *Config) { scope := "manager"; c.AuthScope = &scope },
		func(c *Config) { c.RedirectOrigins = []string{"https://example.com"} },
	} {
		invalid := proto.Clone(config).(*Config)
		extra(invalid)
		if _, err := StaticHooks(invalid)(context.Background(), appsdk.Context{}, &GetHooksRequest{}); err == nil {
			t.Fatal("accepted unrelated metadata")
		}
	}
}

func TestAppPersonInvocationRevisionWire(t *testing.T) {
	for _, revision := range []int64{9007199254740993, 9223372036854775807} {
		input := &AppPersonInvokedInput{Type: TypeAppPersonInvoked, Version: 1, SourceContentRevision: revision}
		wire, err := protojson.Marshal(input)
		if err != nil {
			t.Fatal(err)
		}
		var fields map[string]json.RawMessage
		if err := json.Unmarshal(wire, &fields); err != nil {
			t.Fatal(err)
		}
		var value string
		if err := json.Unmarshal(fields["sourceContentRevision"], &value); err != nil {
			t.Fatalf("revision is not a decimal string: %s", wire)
		}
		var decoded AppPersonInvokedInput
		if err := protojson.Unmarshal(wire, &decoded); err != nil {
			t.Fatal(err)
		}
		if decoded.SourceContentRevision != revision {
			t.Fatal("revision lost precision")
		}
	}
}

func TestAppPersonUserChatInvocationWire(t *testing.T) {
	for _, thread := range []string{"", `,"threadId":null`} {
		wire := `{"type":"appPerson.invoked","version":1,"chatType":"userChat","chatId":"user-chat-1","credentialScope":"channel","invokingManagerId":"manager-1","sourceContentRevision":"9007199254740993"` + thread + `}`
		var input AppPersonInvokedInput
		if err := protojson.Unmarshal([]byte(wire), &input); err != nil {
			t.Fatal(err)
		}
		if input.ChatType != "userChat" || input.CredentialScope != "channel" || input.InvokingManagerId != "manager-1" || input.ThreadId != nil || input.SourceContentRevision != 9007199254740993 {
			t.Fatalf("UserChat invocation changed its source or execution identity: %v", &input)
		}
	}
}
