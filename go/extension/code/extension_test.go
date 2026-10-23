package code

import (
	"context"
	"encoding/json"
	"github.com/channel-io/app-sdk/go/appsdk"
	"google.golang.org/protobuf/types/known/structpb"
	"strings"
	"testing"
)

func TestSnapshotRetainsRequiredZeroAndNullValues(t *testing.T) {
	data, err := (&codeResult{response: &Snapshot{SessionKey: "s", Version: "0", Status: "idle", Observation: &Observation{Status: "unknown", ObservedAt: structpb.NewNullValue()}, UpdatedAt: "2026-10-22T00:00:00Z"}}).MarshalSDKResult()
	if err != nil {
		t.Fatal(err)
	}
	var value map[string]any
	if err := json.Unmarshal(data, &value); err != nil {
		t.Fatal(err)
	}
	for _, name := range []string{"question", "lastResult", "error"} {
		item, ok := value[name]
		if !ok || item != nil {
			t.Fatalf("%s must be explicit null: %s", name, data)
		}
	}
	if value["pendingInputCount"] != float64(0) {
		t.Fatalf("missing zero: %s", data)
	}
	if items, ok := value["artifacts"].([]any); !ok || len(items) != 0 {
		t.Fatalf("missing empty array: %s", data)
	}
	observation := value["observation"].(map[string]any)
	if item, ok := observation["observedAt"]; !ok || item != nil {
		t.Fatalf("missing observation null: %s", data)
	}
}

func TestBuilderValidatesRawInputAndPreservesInvocation(t *testing.T) {
	app := appsdk.New(appsdk.Options{AppID: "app"})
	var calls int
	var keys []string
	err := app.Use(Extension().SendInput(func(_ context.Context, ctx appsdk.Context, input *SendInputRequest) (*Receipt, error) {
		calls++
		keys = append(keys, ctx.Invocation.IdempotencyKey)
		return &Receipt{SessionKey: input.SessionKey, Accepted: true}, nil
	}))
	if err != nil {
		t.Fatal(err)
	}
	request := appsdk.FunctionRequest{Method: FunctionSendInput, Context: appsdk.Context{Invocation: &appsdk.InvocationContext{IdempotencyKey: "stable-call"}}, Params: json.RawMessage(`{"sessionKey":"s","text":"fix","future":true}`)}
	for i := 0; i < 2; i++ {
		if result := app.HandleRequest(context.Background(), request); result.Error != nil {
			t.Fatalf("valid request: %+v", result.Error)
		}
	}
	if len(keys) != 2 || keys[0] != "stable-call" || keys[1] != "stable-call" {
		t.Fatalf("identity lost: %v", keys)
	}
	for _, params := range []string{`{"sessionKey":"s","text":"fix","context":[{"title":"t","text":"x","extra":1}]}`, `{"sessionKey":"s","text":"fix","future":"` + strings.Repeat("a", 256*1024) + `"}`} {
		request.Params = json.RawMessage(params)
		if result := app.HandleRequest(context.Background(), request); result.Error == nil {
			t.Fatal("invalid raw input reached handler")
		}
	}
	request.Params = json.RawMessage(`{"sessionKey":"s","text":"fix"}`)
	request.Context.Invocation = nil
	if result := app.HandleRequest(context.Background(), request); result.Error == nil {
		t.Fatal("missing invocation reached handler")
	}
	if calls != 2 {
		t.Fatalf("invalid call reached handler: %d", calls)
	}
}

func TestBuilderRejectsMismatchedSessionResult(t *testing.T) {
	app := appsdk.New(appsdk.Options{AppID: "app"})
	if err := app.Use(Extension().SendInput(func(context.Context, appsdk.Context, *SendInputRequest) (*Receipt, error) {
		return &Receipt{SessionKey: "other", Accepted: true}, nil
	})); err != nil {
		t.Fatal(err)
	}
	result := app.HandleRequest(context.Background(), appsdk.FunctionRequest{Method: FunctionSendInput, Context: appsdk.Context{Invocation: &appsdk.InvocationContext{IdempotencyKey: "key"}}, Params: json.RawMessage(`{"sessionKey":"s","text":"fix"}`)})
	if result.Error == nil {
		t.Fatal("mismatched session result accepted")
	}
}

func TestBuilderStripsUnknownProtoAliases(t *testing.T) {
	app := appsdk.New(appsdk.Options{AppID: "app"})
	var calls int
	receipt := func(key string) (*Receipt, error) {
		calls++
		if key != "s" {
			t.Fatalf("unknown field changed session identity: %q", key)
		}
		return &Receipt{SessionKey: key, Accepted: true}, nil
	}
	err := app.Use(Extension().SendInput(func(_ context.Context, _ appsdk.Context, input *SendInputRequest) (*Receipt, error) {
		return receipt(input.SessionKey)
	}).GetSession(func(_ context.Context, _ appsdk.Context, input *GetSessionRequest) (*Snapshot, error) {
		calls++
		if input.SessionKey != "s" {
			t.Fatalf("unknown field changed session identity: %q", input.SessionKey)
		}
		return &Snapshot{SessionKey: input.SessionKey, Version: "0", Status: "idle", Observation: &Observation{Status: "unknown", ObservedAt: structpb.NewNullValue()}, UpdatedAt: "2026-10-22T00:00:00Z"}, nil
	}).StopSession(func(_ context.Context, _ appsdk.Context, input *StopSessionRequest) (*Receipt, error) {
		return receipt(input.SessionKey)
	}))
	if err != nil {
		t.Fatal(err)
	}
	for _, method := range []string{FunctionSendInput, FunctionGetSession, FunctionStopSession} {
		result := app.HandleRequest(context.Background(), appsdk.FunctionRequest{Method: method, Context: appsdk.Context{Invocation: &appsdk.InvocationContext{IdempotencyKey: "call"}}, Params: json.RawMessage(`{"sessionKey":"s","session_key":{"ignored":true},"text":"fix"}`)})
		if result.Error != nil {
			t.Fatalf("%s rejected future JSON field: %+v", method, result.Error)
		}
	}
	if calls != 3 {
		t.Fatalf("expected all handlers, got %d", calls)
	}
}

func TestBuilderRejectsRawURLControls(t *testing.T) {
	app := appsdk.New(appsdk.Options{AppID: "app"})
	if err := app.Use(Extension().SendInput(func(_ context.Context, _ appsdk.Context, input *SendInputRequest) (*Receipt, error) {
		return &Receipt{SessionKey: input.SessionKey, Accepted: true}, nil
	})); err != nil {
		t.Fatal(err)
	}
	for _, control := range []string{"\n", "\r", "\t", "\x7f"} {
		params, err := json.Marshal(map[string]any{"sessionKey": "s", "text": "fix", "context": []any{map[string]any{"title": "t", "text": "x", "sourceUrl": "https://example.com/a" + control + "b"}}})
		if err != nil {
			t.Fatal(err)
		}
		result := app.HandleRequest(context.Background(), appsdk.FunctionRequest{Method: FunctionSendInput, Context: appsdk.Context{Invocation: &appsdk.InvocationContext{IdempotencyKey: "call"}}, Params: params})
		if result.Error == nil {
			t.Fatalf("raw URL control %q accepted", control)
		}
	}
}

func TestBuilderUnicodeLengthAndBlankInput(t *testing.T) {
	app := appsdk.New(appsdk.Options{AppID: "app"})
	if err := app.Use(Extension().SendInput(func(_ context.Context, _ appsdk.Context, input *SendInputRequest) (*Receipt, error) {
		return &Receipt{SessionKey: input.SessionKey, Accepted: true}, nil
	})); err != nil {
		t.Fatal(err)
	}
	key := strings.Repeat("😀", 200)
	for _, test := range []struct {
		key, text, invocation string
		valid                 bool
	}{
		{key, "fix", key, true},
		{key + "😀", "fix", key, false},
		{key, "fix", key + "😀", false},
		{key, "fix", "\ufeff", false},
		{key, "\u00a0", key, false},
		{key, "\u0085", key, false},
		{key, "\u2003", key, false},
		{key, "\ufeff", key, false},
	} {
		params, err := json.Marshal(map[string]string{"sessionKey": test.key, "text": test.text})
		if err != nil {
			t.Fatal(err)
		}
		result := app.HandleRequest(context.Background(), appsdk.FunctionRequest{Method: FunctionSendInput, Context: appsdk.Context{Invocation: &appsdk.InvocationContext{IdempotencyKey: test.invocation}}, Params: params})
		if (result.Error == nil) != test.valid {
			t.Fatalf("valid=%v: %+v", test.valid, result.Error)
		}
	}
}

func TestBuilderUnicodeResultLength(t *testing.T) {
	for _, count := range []int{8192, 8193} {
		app := appsdk.New(appsdk.Options{AppID: "app"})
		if err := app.Use(Extension().GetSession(func(context.Context, appsdk.Context, *GetSessionRequest) (*Snapshot, error) {
			return &Snapshot{SessionKey: "s", Version: "1", Status: "idle", Observation: &Observation{Status: "unknown", ObservedAt: structpb.NewNullValue()}, UpdatedAt: "2026-10-22T00:00:00Z", LastResult: &Result{Text: strings.Repeat("😀", count), Source: "adapter", RecordedAt: "2026-10-22T00:00:00Z"}}, nil
		})); err != nil {
			t.Fatal(err)
		}
		result := app.HandleRequest(context.Background(), appsdk.FunctionRequest{Method: FunctionGetSession, Params: json.RawMessage(`{"sessionKey":"s"}`)})
		if (result.Error == nil) != (count == 8192) {
			t.Fatalf("count=%d: %+v", count, result.Error)
		}
	}
}

func TestBuilderTimestampContract(t *testing.T) {
	app := appsdk.New(appsdk.Options{AppID: "app"})
	var observed string
	if err := app.Use(Extension().GetSession(func(context.Context, appsdk.Context, *GetSessionRequest) (*Snapshot, error) {
		return &Snapshot{SessionKey: "s", Version: "1", Status: "idle", Observation: &Observation{Status: "unknown", ObservedAt: structpb.NewNullValue()}, UpdatedAt: observed}, nil
	})); err != nil {
		t.Fatal(err)
	}
	for _, test := range []struct {
		value string
		valid bool
	}{
		{"2026-10-22T00:00:00Z", true},
		{"2026-10-22T09:00:00.123456789+09:00", true},
		{"2026-10-22T00:00Z", false},
		{"2026-10-22T00:00:00+0900", false},
		{"2026-10-22T00:00:00+99:99", false},
		{"2026-10-22t00:00:00z", false},
		{"2026-10-22T00:00:60Z", false},
		{"0000-01-01T00:00:00Z", false},
	} {
		observed = test.value
		result := app.HandleRequest(context.Background(), appsdk.FunctionRequest{Method: FunctionGetSession, Params: json.RawMessage(`{"sessionKey":"s"}`)})
		if (result.Error == nil) != test.valid {
			t.Fatalf("%s valid=%v: %+v", observed, test.valid, result.Error)
		}
	}
}

func TestBuilderRequiresHTTPSHost(t *testing.T) {
	app := appsdk.New(appsdk.Options{AppID: "app"})
	if err := app.Use(Extension().SendInput(func(_ context.Context, _ appsdk.Context, input *SendInputRequest) (*Receipt, error) {
		return &Receipt{SessionKey: input.SessionKey, Accepted: true}, nil
	})); err != nil {
		t.Fatal(err)
	}
	for _, tc := range []struct {
		url   string
		valid bool
	}{
		{"https://", false}, {"https://:443/", false}, {"https://user@/", false},
		{"https://example.com", true}, {"https://example.com?x=1", true},
		{"https://[::1]:443/path", true}, {"https://user@example.com/path", true},
	} {
		params, err := json.Marshal(map[string]any{"sessionKey": "s", "text": "fix", "context": []any{map[string]any{"title": "t", "text": "x", "sourceUrl": tc.url}}})
		if err != nil {
			t.Fatal(err)
		}
		result := app.HandleRequest(context.Background(), appsdk.FunctionRequest{Method: FunctionSendInput, Context: appsdk.Context{Invocation: &appsdk.InvocationContext{IdempotencyKey: "call"}}, Params: params})
		if (result.Error == nil) != tc.valid {
			t.Fatalf("url=%q valid=%v: %+v", tc.url, tc.valid, result.Error)
		}
	}
}
