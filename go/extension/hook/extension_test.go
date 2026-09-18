package hook

import (
	"context"
	"strings"
	"testing"

	"github.com/channel-io/app-sdk/go/appsdk"
	"google.golang.org/protobuf/encoding/protojson"
	"google.golang.org/protobuf/proto"
	"google.golang.org/protobuf/types/known/structpb"
)

func TestOAuthFlowHookContracts(t *testing.T) {
	for _, kind := range []string{TypeOAuthBeforeAuthorization, TypeOAuthAfterAuthorization} {
		t.Run(kind, func(t *testing.T) {
			handler := StaticHooks(&Config{
				Type:               kind,
				ActionFunctionName: "hooks.oauth.flow",
				RedirectOrigins:    []string{"https://provider.example"},
			})
			response, err := handler(context.Background(), appsdk.Context{}, &GetHooksRequest{})
			if err != nil || len(response.Hooks) != 1 || response.Hooks[0].RedirectOrigins[0] != "https://provider.example" {
				t.Fatalf("unexpected flow hook metadata: response=%v err=%v", response, err)
			}
		})
	}
	for _, result := range []*OAuthFlowHookResult{
		{Type: OAuthFlowResultContinue},
		{Type: OAuthFlowResultRedirect, Url: proto.String("https://provider.example/install")},
	} {
		encoded, err := protojson.Marshal(result)
		if err != nil {
			t.Fatal(err)
		}
		if result.Type == OAuthFlowResultContinue && strings.Contains(string(encoded), "url") {
			t.Fatalf("continue must not emit url: %s", encoded)
		}
		var decoded OAuthFlowHookResult
		if err := protojson.Unmarshal(encoded, &decoded); err != nil || !proto.Equal(result, &decoded) {
			t.Fatalf("result did not round trip: result=%v err=%v", result, err)
		}
	}
}

func TestStaticWebhookHooks(t *testing.T) {
	endpointToken := strings.Repeat("a", 32)
	handler := StaticHooks(&Config{
		Type:               TypeWebhookReceived,
		ActionFunctionName: "hooks.bcart.receive",
		SystemVersion:      "v1",
		TargetId:           "bcart.orders",
		Webhook: &WebhookConfig{
			EndpointToken: endpointToken,
		},
	})

	response, err := handler(context.Background(), appsdk.Context{}, &GetHooksRequest{})
	if err != nil {
		t.Fatalf("StaticHooks returned an error: %v", err)
	}
	if len(response.Hooks) != 1 {
		t.Fatalf("expected one hook, got %d", len(response.Hooks))
	}
	hook := response.Hooks[0]
	if hook.Type != TypeWebhookReceived || hook.TargetId != "bcart.orders" {
		t.Fatalf("unexpected webhook hook: %#v", hook)
	}
	if hook.Webhook == nil || hook.Webhook.EndpointToken != endpointToken {
		t.Fatalf("expected webhook endpoint token %q, got %#v", endpointToken, hook.Webhook)
	}
}

func TestStaticManagerWebhookHooks(t *testing.T) {
	handler := StaticHooks(&Config{
		Type:               TypeWebhookReceived,
		ActionFunctionName: "hooks.provider.receive",
		SystemVersion:      "v1",
		TargetId:           "provider.events",
		Webhook: &WebhookConfig{
			ExecutionScope: WebhookExecutionScopeManager,
		},
	})

	response, err := handler(context.Background(), appsdk.Context{}, &GetHooksRequest{})
	if err != nil {
		t.Fatalf("StaticHooks returned an error: %v", err)
	}
	if len(response.Hooks) != 1 {
		t.Fatalf("expected one hook, got %d", len(response.Hooks))
	}
	webhook := response.Hooks[0].Webhook
	if webhook == nil || webhook.ExecutionScope != WebhookExecutionScopeManager || webhook.EndpointToken != "" {
		t.Fatalf("unexpected manager webhook config: %#v", webhook)
	}
}

func TestStaticTeamChatMessageCreatedHook(t *testing.T) {
	handler := StaticHooks(&Config{
		Type:               TypeTeamChatMessageCreated,
		ActionFunctionName: "linear.teamChatMessageCreated.handle",
		SystemVersion:      "v1",
	})

	response, err := handler(context.Background(), appsdk.Context{}, &GetHooksRequest{})
	if err != nil {
		t.Fatalf("StaticHooks returned an error: %v", err)
	}
	if len(response.Hooks) != 1 || response.Hooks[0].Type != TypeTeamChatMessageCreated {
		t.Fatalf("unexpected TeamChat message hook: %#v", response.Hooks)
	}

	snapshot, err := structpb.NewStruct(map[string]any{
		"id":         "message-1",
		"channelId":  "channel-1",
		"chatId":     "group-1",
		"threadId":   "root-message-1",
		"personType": "manager",
		"personId":   "manager-1",
		"plainText":  "Ship the webhook path.",
	})
	if err != nil {
		t.Fatalf("failed to build Message snapshot: %v", err)
	}
	input := &TeamChatMessageCreatedInput{
		EventId:    "event-1",
		ChannelId:  "channel-1",
		GroupId:    "group-1",
		MessageId:  "message-1",
		OccurredAt: "2026-09-09T10:30:00Z",
		Snapshot:   snapshot,
	}
	result := &TeamChatMessageCreatedResult{
		HookHandlingResult: TeamChatMessageCreatedResultSucceeded,
		Terminal:           true,
	}
	if input.Snapshot.GetFields()["personId"].GetStringValue() != "manager-1" || result.HookHandlingResult != "succeeded" || !result.Terminal {
		t.Fatalf("unexpected TeamChat hook contract: input=%#v result=%#v", input, result)
	}
}

func TestOAuthHookScopes(t *testing.T) {
	for _, kind := range []string{TypeOAuthBeforeAuthorization, TypeOAuthAfterAuthorization, TypeOAuthConnected, TypeOAuthDisconnected} {
		for _, scope := range []*string{nil, proto.String("channel"), proto.String("manager"), proto.String("caller"), proto.String("")} {
			config := &Config{Type: kind, ActionFunctionName: "hooks.oauth.handle", AuthScope: scope}
			result, err := StaticHooks(config)(context.Background(), appsdk.Context{}, &GetHooksRequest{})
			valid := scope == nil || *scope == "channel" || *scope == "manager"
			if valid != (err == nil) {
				t.Fatalf("scope validation: kind=%s scope=%v err=%v", kind, scope, err)
			}
			if valid {
				encoded, err := protojson.Marshal(result)
				if err != nil {
					t.Fatal(err)
				}
				var decoded GetHooksResponse
				if err := protojson.Unmarshal(encoded, &decoded); err != nil || !proto.Equal(result, &decoded) {
					t.Fatalf("scope round trip failed: %v", err)
				}
				if scope == nil && strings.Contains(string(encoded), "authScope") {
					t.Fatalf("shared scope must stay omitted: %s", encoded)
				}
			}
		}
	}
	_, err := StaticHooks(&Config{Type: TypeConfigSaved, ActionFunctionName: "hooks.config.handle", AuthScope: proto.String("channel")})(context.Background(), appsdk.Context{}, &GetHooksRequest{})
	if err == nil {
		t.Fatal("non-OAuth hook must reject authScope")
	}
}
