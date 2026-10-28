package issue_test

import (
	"context"
	"encoding/json"
	"strings"
	"testing"

	"github.com/channel-io/app-sdk/go/appsdk"
	"github.com/channel-io/app-sdk/go/extension/issue"
	"google.golang.org/protobuf/proto"
	"google.golang.org/protobuf/reflect/protoreflect"
)

func TestPublicAliasesCoverIssueMessages(t *testing.T) {
	aliases := []proto.Message{
		&issue.SearchIssuesRequest{}, &issue.SearchIssuesResponse{},
		&issue.GetIssueRequest{}, &issue.GetIssueResponse{},
		&issue.GetIssuesRequest{}, &issue.GetIssuesResponse{},
		&issue.GetIssueTransitionsRequest{}, &issue.GetIssueTransitionsResponse{},
		&issue.ExecuteIssueTransitionRequest{}, &issue.ExecuteIssueTransitionResponse{},
		&issue.StartSubscriptionRequest{}, &issue.StartSubscriptionResponse{},
		&issue.StopSubscriptionRequest{}, &issue.StopSubscriptionResponse{},
		&issue.ExternalIssue{}, &issue.ProviderState{}, &issue.Transition{}, &issue.Error{},
		&issue.GetIssuesResult{}, &issue.TransitionInput{}, &issue.TransitionField{}, &issue.Container{}, &issue.Actor{},
	}
	public := map[protoreflect.FullName]bool{}
	for _, alias := range aliases {
		public[alias.ProtoReflect().Descriptor().FullName()] = true
	}
	seen := map[protoreflect.FullName]bool{}
	var visit func(protoreflect.MessageDescriptor)
	visit = func(desc protoreflect.MessageDescriptor) {
		name := desc.FullName()
		if !strings.HasPrefix(string(name), "channel.app.sdk.v1.") || seen[name] {
			return
		}
		seen[name] = true
		if !public[name] {
			t.Errorf("missing public alias for %s", name)
		}
		fields := desc.Fields()
		for i := 0; i < fields.Len(); i++ {
			field := fields.Get(i)
			if field.IsMap() {
				field = field.MapValue()
			}
			if field.Message() != nil {
				visit(field.Message())
			}
		}
	}
	for _, alias := range aliases[:14] {
		visit(alias.ProtoReflect().Descriptor())
	}
}

func TestRequiredZeroValuesOnWire(t *testing.T) {
	for _, available := range []bool{false, true} {
		app := appsdk.New(appsdk.Options{AppID: "test"})
		err := app.Use(issue.Extension().SearchIssues(func(context.Context, appsdk.Context, *issue.SearchIssuesRequest) (*issue.SearchIssuesResponse, error) {
			return &issue.SearchIssuesResponse{}, nil
		}).GetIssueTransitions(func(context.Context, appsdk.Context, *issue.GetIssueTransitionsRequest) (*issue.GetIssueTransitionsResponse, error) {
			out := &issue.GetIssueTransitionsResponse{StateToken: "token"}
			if available {
				out.Transitions = []*issue.Transition{{Id: "done", Name: "Done", TargetState: "completed", Availability: "available", InputSchema: &issue.TransitionInput{Type: "object", Properties: map[string]*issue.TransitionField{"comment": {Type: "string"}}}}}
			}
			if available {
				out.Transitions = append(out.Transitions, &issue.Transition{Id: "start", Name: "Start", TargetState: "started", Availability: "available", InputSchema: &issue.TransitionInput{Type: "object"}})
			}
			return out, nil
		}))
		if err != nil {
			t.Fatal(err)
		}
		search := app.HandleRequest(context.Background(), appsdk.FunctionRequest{Method: issue.FunctionSearchIssues})
		if search.Error != nil {
			t.Fatal(search.Error)
		}
		if string(search.Result) != `{"issues":[]}` {
			t.Fatalf("empty search: %s", search.Result)
		}
		result := app.HandleRequest(context.Background(), appsdk.FunctionRequest{Method: issue.FunctionGetIssueTransitions, Params: json.RawMessage(`{"issueId":"id"}`)})
		if result.Error != nil {
			t.Fatal(result.Error)
		}
		var wire map[string]any
		if err := json.Unmarshal(result.Result, &wire); err != nil {
			t.Fatal(err)
		}
		entries, ok := wire["transitions"].([]any)
		if !ok {
			t.Fatalf("missing transitions: %s", result.Result)
		}
		if available {
			empty := entries[1].(map[string]any)["inputSchema"].(map[string]any)
			if props, ok := empty["properties"].(map[string]any); !ok || len(props) != 0 {
				t.Fatalf("missing empty properties: %s", result.Result)
			}
			entry := entries[0].(map[string]any)
			input := entry["inputSchema"].(map[string]any)
			if input["additionalProperties"] != false {
				t.Fatalf("missing false: %s", result.Result)
			}
			field := input["properties"].(map[string]any)["comment"].(map[string]any)
			if _, ok := field["enum"]; ok {
				t.Fatalf("absent optional enum emitted: %s", result.Result)
			}
			if _, ok := entry["targetProviderState"]; ok {
				t.Fatalf("absent optional state emitted: %s", result.Result)
			}
		}
	}
}

func TestSubscriptionWireContract(t *testing.T) {
	app := appsdk.New(appsdk.Options{AppID: "test"})
	err := app.Use(issue.Extension().StartSubscription(func(_ context.Context, ctx appsdk.Context, input *issue.StartSubscriptionRequest) (*issue.StartSubscriptionResponse, error) {
		if input.SubscriptionId != "sub-1" || input.IssueId != "issue-1" || ctx.IssueSubscription == nil || ctx.IssueSubscription.ConnectionGeneration != 2 {
			t.Fatalf("lost subscription input or context: %+v %+v", input, ctx)
		}
		return &issue.StartSubscriptionResponse{Status: "active", ProviderTenantId: "workspace-1", Issue: &issue.ExternalIssue{IssueId: "issue-1", Identifier: "ENG-1", Title: "Example", Url: "https://linear.app/example", State: "started", ProviderState: &issue.ProviderState{Name: "Started"}, CreatedAt: "2026-10-28T00:00:00Z"}}, nil
	}).StopSubscription(func(_ context.Context, ctx appsdk.Context, input *issue.StopSubscriptionRequest) (*issue.StopSubscriptionResponse, error) {
		if input.SubscriptionId != "sub-1" || ctx.GetAuthToken() != "" {
			t.Fatal("stop should not need provider OAuth")
		}
		return &issue.StopSubscriptionResponse{Stopped: true}, nil
	}))
	if err != nil {
		t.Fatal(err)
	}
	start := app.HandleRequest(context.Background(), appsdk.FunctionRequest{Method: issue.FunctionStartSubscription, Params: json.RawMessage(`{"subscriptionId":"sub-1","issueId":"issue-1"}`), Context: appsdk.Context{IssueSubscription: &appsdk.IssueSubscriptionContext{SubscriptionID: "sub-1", ConnectionID: "conn-1", ConnectionGeneration: 2}}})
	if start.Error != nil {
		t.Fatal(start.Error)
	}
	var result struct {
		Status           string `json:"status"`
		ProviderTenantID string `json:"providerTenantId"`
		Issue            struct {
			ID string `json:"issueId"`
		} `json:"issue"`
	}
	if err := json.Unmarshal(start.Result, &result); err != nil {
		t.Fatal(err)
	}
	if result.Status != "active" || result.ProviderTenantID != "workspace-1" || result.Issue.ID != "issue-1" {
		t.Fatalf("invalid baseline envelope: %s", start.Result)
	}
	stop := app.HandleRequest(context.Background(), appsdk.FunctionRequest{Method: issue.FunctionStopSubscription, Params: json.RawMessage(`{"subscriptionId":"sub-1"}`)})
	if stop.Error != nil || string(stop.Result) != `{"stopped":true}` {
		t.Fatalf("invalid stop: %+v", stop)
	}
}
