package hook

import (
	"context"
	"strings"
	"testing"

	"github.com/channel-io/app-sdk/go/appsdk"
	"google.golang.org/protobuf/types/known/structpb"
)

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
