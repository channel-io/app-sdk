package issue_test

import (
	"context"
	"encoding/json"
	"strings"
	"testing"

	"github.com/channel-io/app-sdk/go/appsdk"
	"github.com/channel-io/app-sdk/go/extension/issue"
)

func TestCreateCommentContract(t *testing.T) {
	app := appsdk.New(appsdk.Options{AppID: "test"})
	calls := 0
	var received string
	var response *issue.CreateCommentResponse
	var handlerErr error
	if err := app.Use(issue.Extension().CreateComment(func(_ context.Context, _ appsdk.Context, in *issue.CreateCommentRequest) (*issue.CreateCommentResponse, error) {
		calls++
		received = in.Body
		if in.IssueId != "issue" || in.AccountRef != "account" {
			t.Fatalf("input lost: %+v", in)
		}
		return response, handlerErr
	})); err != nil {
		t.Fatal(err)
	}
	valid := map[string]any{"issueId": "issue", "accountRef": "account", "body": " text\n", "requestId": "00000000-0000-4000-8000-000000000000"}
	invoke := func(v map[string]any) appsdk.FunctionResponse {
		b, _ := json.Marshal(v)
		return app.HandleRequest(context.Background(), appsdk.FunctionRequest{Method: issue.FunctionCreateComment, Params: b})
	}
	for _, tc := range []struct {
		key   string
		value any
	}{
		{"issueId", " "}, {"accountRef", nil}, {"body", "\ufeff"}, {"body", strings.Repeat("😀", 8001)},
		{"requestId", "00000000-0000-4000-8000-00000000000A"}, {"recoveryOnly", nil}, {"recoveryOnly", "false"},
	} {
		v := map[string]any{}
		for k, x := range valid {
			v[k] = x
		}
		v[tc.key] = tc.value
		result := invoke(v)
		if result.Error == nil || result.Error.Type != "invalidInput" {
			t.Fatalf("%s=%v: %+v", tc.key, tc.value, result)
		}
	}
	if calls != 0 {
		t.Fatalf("invalid input reached handler: %d", calls)
	}
	response = &issue.CreateCommentResponse{CommentId: "comment"}
	valid["body"] = strings.Repeat("😀", 8000)
	valid["recoveryOnly"] = false
	valid["issue_id"] = "ignored"
	result := invoke(valid)
	if result.Error != nil || received != valid["body"] || string(result.Result) != `{"commentId":"comment"}` {
		t.Fatalf("valid: %+v", result)
	}
	for _, out := range []*issue.CreateCommentResponse{nil, {}, {CommentId: " "}} {
		response = out
		if result := invoke(valid); result.Error == nil {
			t.Fatalf("invalid output accepted: %+v", result)
		}
	}
	for _, raw := range []string{"", "http://example.com", "/relative", "https://", "https://example.com/a b", `https://example.com/a\b`} {
		response = &issue.CreateCommentResponse{CommentId: "comment", Url: &raw}
		if result := invoke(valid); result.Error == nil {
			t.Fatalf("invalid URL accepted: %q", raw)
		}
	}
	url := "HTTPS://example.com/comment"
	response = &issue.CreateCommentResponse{CommentId: "comment", Url: &url}
	if result := invoke(valid); result.Error != nil || !strings.Contains(string(result.Result), url) {
		t.Fatalf("valid URL: %+v", result)
	}
	handlerErr = appsdk.NewError(appsdk.CodeBadRequest, "custom", "custom error", nil)
	if result := invoke(valid); result.Error == nil || result.Error.Type != "custom" {
		t.Fatalf("handler error lost: %+v", result)
	}
}
