package messaging_test

import (
	"context"
	"encoding/json"
	"testing"

	"github.com/channel-io/app-sdk/go/appsdk"
	"github.com/channel-io/app-sdk/go/extension/messaging"
)

func TestExtensionRegistersProtoHandlers(t *testing.T) {
	app := appsdk.New(appsdk.Options{AppID: "app"})
	if err := app.Use(messaging.Extension().
		InboxOnMediumMessageCreated(func(_ context.Context, _ appsdk.Context, in *messaging.OnMediumMessageCreatedInput) (*messaging.OnMediumMessageCreatedOutput, error) {
			if in.GetUserChat().GetId() != "user-chat-1" {
				t.Fatalf("unexpected user chat id: %s", in.GetUserChat().GetId())
			}
			if in.GetUserChat().GetVersion() != 5 {
				t.Fatalf("expected protobuf JSON uint64 string to decode, got %d", in.GetUserChat().GetVersion())
			}
			if got := in.GetMessage().GetOptions(); len(got) != 1 || got[0] != messaging.MessageOptionPrivate {
				t.Fatalf("unexpected message options: %v", got)
			}
			errorCode := int32(91999)
			return &messaging.OnMediumMessageCreatedOutput{
				SendResult: &messaging.SendResult{SendState: "failed", ErrorCode: &errorCode},
			}, nil
		}),
	); err != nil {
		t.Fatal(err)
	}

	if !app.HasMethod(messaging.FunctionInboxOnMediumMessageCreated) {
		t.Fatalf("unexpected methods: %v", app.Methods())
	}
	targets := app.AutoRegisterTargets()
	if len(targets) != 1 || targets[0].Name != messaging.ExtensionName {
		t.Fatalf("unexpected targets: %+v", targets)
	}

	schemas := app.Schemas()
	if got := schemas[0].InputSchema["type"]; got != "object" {
		t.Fatalf("expected proto schema to stay object-shaped, got %v", schemas[0].InputSchema)
	}

	res := app.HandleRequest(context.Background(), appsdk.FunctionRequest{
		Method: messaging.FunctionInboxOnMediumMessageCreated,
		Params: json.RawMessage(`{
			"userChat": {
				"id": "user-chat-1",
				"channelId": "channel-1",
				"userId": "user-1",
				"mediumType": "app",
				"mediumTopicKey": "topic-1",
				"version": "5"
			},
			"message": {
				"id": "message-1",
				"channelId": "channel-1",
				"chatType": "userChat",
				"chatId": "user-chat-1",
				"personType": "user",
				"personId": "user-1",
				"language": "ko",
				"createdAt": "2026-04-09T11:47:05Z",
				"options": ["MESSAGE_OPTION_PRIVATE"],
				"writingType": "WRITING_TYPE_STANDARD"
			}
		}`),
	})
	if res.Error != nil {
		t.Fatalf("unexpected error: %+v", res.Error)
	}
	var out map[string]any
	if err := json.Unmarshal(res.Result, &out); err != nil {
		t.Fatal(err)
	}
	sendResult := out["sendResult"].(map[string]any)
	if sendResult["sendState"] != "failed" {
		t.Fatalf("unexpected result: %s", string(res.Result))
	}
	if sendResult["errorCode"] != float64(91999) {
		t.Fatalf("unexpected result: %s", string(res.Result))
	}
}
