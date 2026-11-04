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
		&issue.GetCreateSchemaRequest{}, &issue.GetCreateSchemaResponse{}, &issue.CreateIssueRequest{}, &issue.CreateIssueResponse{}, &issue.CreateChoice{}, &issue.CreateFieldValue{}, &issue.CreateFormField{}, &issue.CreateValues{}, &issue.CreateSelectedValues{}, &issue.CreateSchemaPage{}, &issue.FieldError{}, &issue.Recovery{},
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

func TestSubscriptionRejectsInvalidIdentityBeforeHandler(t *testing.T) {
	app := appsdk.New(appsdk.Options{AppID: "test"})
	calls := 0
	err := app.Use(issue.Extension().StartSubscription(func(_ context.Context, _ appsdk.Context, in *issue.StartSubscriptionRequest) (*issue.StartSubscriptionResponse, error) {
		calls++
		return &issue.StartSubscriptionResponse{}, nil
	}).StopSubscription(func(_ context.Context, _ appsdk.Context, in *issue.StopSubscriptionRequest) (*issue.StopSubscriptionResponse, error) {
		calls++
		return &issue.StopSubscriptionResponse{Stopped: true}, nil
	}))
	if err != nil {
		t.Fatal(err)
	}
	for _, method := range []string{issue.FunctionStartSubscription, issue.FunctionStopSubscription} {
		for _, params := range []string{
			`{}`, `null`, `[]`, `{"subscriptionId":7}`, `{"subscriptionId":null}`,
			`{"subscriptionId":""}`, `{"subscriptionId":"bad space"}`, `{"subscriptionId":"line\n"}`,
			`{"subscriptionId":"` + strings.Repeat("a", 129) + `"}`, `{"subscription_id":"sub"}`,
		} {
			t.Run(method+params, func(t *testing.T) {
				result := app.HandleRequest(context.Background(), appsdk.FunctionRequest{Method: method, Params: json.RawMessage(params)})
				if result.Error == nil || result.Error.Code != appsdk.CodeBadRequest {
					t.Fatalf("expected bad request: %+v", result)
				}
				var data map[string]any
				if err := json.Unmarshal(result.Error.Data, &data); err != nil || data["type"] != "invalidInput" {
					t.Fatalf("expected canonical invalidInput: %+v", result.Error)
				}
			})
		}
	}
	for _, issueID := range []any{nil, 7, "", " \t\n", "\ufeff"} {
		params, _ := json.Marshal(map[string]any{"subscriptionId": "sub", "issueId": issueID})
		result := app.HandleRequest(context.Background(), appsdk.FunctionRequest{Method: issue.FunctionStartSubscription, Params: params})
		if result.Error == nil || result.Error.Type != "invalidInput" {
			t.Fatalf("expected invalid issue identity: %+v", result)
		}
	}
	if calls != 0 {
		t.Fatalf("invalid input reached handler %d times", calls)
	}
	result := app.HandleRequest(context.Background(), appsdk.FunctionRequest{Method: issue.FunctionStopSubscription, Params: json.RawMessage(`{"subscriptionId":"sub","subscription_id":"ignored","channelId":"ignored"}`)})
	if result.Error != nil || calls != 1 {
		t.Fatalf("unknown fields should be stripped: %+v calls=%d", result, calls)
	}
}

func TestCreateInputAndWire(t *testing.T) {
	app := appsdk.New(appsdk.Options{AppID: "test"})
	calls := 0
	account := "account"
	err := app.Use(issue.Extension().GetCreateSchema(func(_ context.Context, _ appsdk.Context, in *issue.GetCreateSchemaRequest) (*issue.GetCreateSchemaResponse, error) {
		calls++
		return &issue.GetCreateSchemaResponse{Availability: "available", AccountRef: &account, Fields: []*issue.CreateFormField{{Key: "labels", Type: "select", Label: "Labels"}}}, nil
	}).CreateIssue(func(_ context.Context, _ appsdk.Context, in *issue.CreateIssueRequest) (*issue.CreateIssueResponse, error) {
		calls++
		if len(in.Fields) != 3 || in.Fields[0].Value.GetBoolValue() || in.Fields[1].Value.GetNumberValue() != 0 || in.Fields[2].Value.GetListValue() == nil || len(in.Fields[2].Value.GetListValue().Values) != 0 || in.RecoveryOnly == nil || *in.RecoveryOnly {
			t.Fatal("values lost")
		}
		return &issue.CreateIssueResponse{Issue: &issue.ExternalIssue{IssueId: "id", Identifier: "TEAM-1", Title: "Example", Url: "https://example.com/issue", State: "open", ProviderState: &issue.ProviderState{Name: "Open"}, CreatedAt: "2026-11-04T00:00:00Z", Container: &issue.Container{Id: "team", Name: "Team"}}}, nil
	}))
	if err != nil {
		t.Fatal(err)
	}
	for _, tc := range []struct{ method, params string }{
		{issue.FunctionGetCreateSchema, `{"selected":{"unknown":1}}`},
		{issue.FunctionGetCreateSchema, `{"page":{"key":"x","since":" "}}`},
		{issue.FunctionGetCreateSchema, `{"selected":{"fields":[{"key":"title","value":"x"}]}}`},
		{issue.FunctionGetCreateSchema, `{"selected":{"fields":[{"key":"x","value":[1,"x"]}]}}`},
		{issue.FunctionGetCreateSchema, `{"selected":{"fields":[{"key":"x","value":["a","a"]}]}}`},
		{issue.FunctionGetCreateSchema, `{"selected":{"fields":[{"key":"x","value":[0,-0]}]}}`},
		{issue.FunctionGetCreateSchema, `{"selected":{"fields":[{"key":"x","value":null}]}}`},
		{issue.FunctionGetCreateSchema, `{"selected":{"fields":[{"key":"x","value":true},{"key":"x","value":false}]}}`},
		{issue.FunctionCreateIssue, `{"containerId":"team","accountRef":"a","requestId":"00000000-0000-4000-8000-00000000000A"}`},
		{issue.FunctionCreateIssue, `{"containerId":" ","accountRef":"a","requestId":"00000000-0000-4000-8000-000000000000"}`},
	} {
		result := app.HandleRequest(context.Background(), appsdk.FunctionRequest{Method: tc.method, Params: json.RawMessage(tc.params)})
		if result.Error == nil || result.Error.Type != "invalidInput" {
			t.Fatalf("expected invalid: %s %+v", tc.params, result)
		}
	}
	if calls != 0 {
		t.Fatal("invalid input reached handler")
	}
	schema := app.HandleRequest(context.Background(), appsdk.FunctionRequest{Method: issue.FunctionGetCreateSchema, Params: json.RawMessage(`{"selected":{"containerId":"team"},"ignored":true}`)})
	if schema.Error != nil || !strings.Contains(string(schema.Result), `"choices":[]`) {
		t.Fatalf("schema: %+v", schema)
	}
	created := app.HandleRequest(context.Background(), appsdk.FunctionRequest{Method: issue.FunctionCreateIssue, Params: json.RawMessage(`{"containerId":"team","accountRef":"a","requestId":"00000000-0000-4000-8000-000000000000","recoveryOnly":false,"fields":[{"key":"a","value":false},{"key":"b","value":0},{"key":"c","value":[]}],"container_id":"ignored"}`)})
	if created.Error != nil || calls != 2 || !strings.Contains(string(created.Result), `"container":{"id":"team","name":"Team"}`) {
		t.Fatalf("create: %+v", created)
	}
}

func TestExternalOnlyRejectsAvailableFields(t *testing.T) {
	app := appsdk.New(appsdk.Options{AppID: "test"})
	account := "account"
	if err := app.Use(issue.Extension().GetCreateSchema(func(context.Context, appsdk.Context, *issue.GetCreateSchemaRequest) (*issue.GetCreateSchemaResponse, error) {
		return &issue.GetCreateSchemaResponse{Availability: "externalOnly", AccountRef: &account}, nil
	})); err != nil {
		t.Fatal(err)
	}
	result := app.HandleRequest(context.Background(), appsdk.FunctionRequest{Method: issue.FunctionGetCreateSchema, Params: json.RawMessage(`{}`)})
	if result.Error == nil {
		t.Fatalf("expected contradictory response to fail: %+v", result)
	}
}
