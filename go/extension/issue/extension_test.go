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
	for _, alias := range aliases[:10] {
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
