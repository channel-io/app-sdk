package native_test

import (
	"context"
	"encoding/base64"
	"encoding/json"
	"fmt"
	sdkv1 "github.com/channel-io/app-sdk/go/internal/gen/channel/app/sdk/v1"
	"google.golang.org/protobuf/encoding/protojson"
	"net/http"
	"net/http/httptest"
	"strings"
	"sync"
	"testing"

	"github.com/channel-io/app-sdk/go/appsdk"
	"github.com/channel-io/app-sdk/go/native"
)

func invocationContext(id string) appsdk.Context {
	return appsdk.Context{Channel: appsdk.Channel{ID: "ch-" + id}, AppPersonInvocation: &appsdk.AppPersonInvocationContext{InvocationID: id, AccessToken: "aph1." + id + "." + base64.RawURLEncoding.EncodeToString(make([]byte, 32))}}
}
func TestAppPersonConcurrentDispatchHTTP(t *testing.T) {
	type received struct {
		Token  string
		Method string
		Params json.RawMessage
	}
	var mu sync.Mutex
	requests := []received{}
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		var req struct {
			Method string          `json:"method"`
			Params json.RawMessage `json:"params"`
		}
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			t.Error(err)
			w.WriteHeader(400)
			return
		}
		mu.Lock()
		requests = append(requests, received{r.Header.Get("x-access-token"), req.Method, req.Params})
		mu.Unlock()
		w.Header().Set("Content-Type", "application/json")
		if req.Method == "issueToken" {
			fmt.Fprint(w, `{"result":{"accessToken":"ordinary","refreshToken":"refresh","expiresIn":3600}}`)
			return
		}
		fmt.Fprint(w, `{"result":{"invocationId":"one","status":"published","deskMessageId":"message"}}`)
	}))
	defer server.Close()
	client := native.NewClient(native.WithBaseURL(server.URL))
	manager := native.NewTokenManager(native.TokenManagerConfig{AppID: "app", AppSecret: "secret", Client: client})
	app := appsdk.New(appsdk.Options{AppID: "app"})
	var entered sync.WaitGroup
	entered.Add(2)
	app.Func("test", appsdk.HandleInput(func(ctx context.Context, fnCtx appsdk.Context, _ *struct{}) (any, error) {
		entered.Done()
		entered.Wait()
		token, err := manager.GetChannelToken(ctx, fnCtx.Channel.ID)
		if err != nil {
			return nil, err
		}
		if token.AccessToken != fnCtx.AppPersonInvocation.AccessToken || token.RefreshToken != "" {
			return nil, fmt.Errorf("wrong delegated token")
		}
		if _, err = client.CallNativeFunction(ctx, "ordinary", "getUserChatAsManager", map[string]string{"userChatId": "source"}); err != nil {
			return nil, err
		}
		if _, err = client.CallAppFunction(ctx, "ordinary", "app", "nested", nil, fnCtx, ""); err != nil {
			return nil, err
		}
		return client.ReplyToAppPersonInvocation(ctx, "ordinary", native.ReplyToAppPersonInvocationParams{InvocationID: fnCtx.AppPersonInvocation.InvocationID, PlainText: "private answer"})
	}))
	var wg sync.WaitGroup
	for _, id := range []string{"one", "two"} {
		wg.Add(1)
		go func(id string) {
			defer wg.Done()
			response := app.HandleRequest(context.Background(), appsdk.FunctionRequest{Method: "test", Context: invocationContext(id)})
			if response.Error != nil {
				t.Error(response.Error)
			}
		}(id)
	}
	wg.Wait()
	if len(requests) != 6 {
		t.Fatalf("got %d requests", len(requests))
	}
	for _, id := range []string{"one", "two"} {
		count := 0
		for _, r := range requests {
			if r.Token == invocationContext(id).AppPersonInvocation.AccessToken {
				count++
				if r.Method == "replyToAppPersonInvocation" {
					var p native.ReplyToAppPersonInvocationParams
					if err := json.Unmarshal(r.Params, &p); err != nil {
						t.Fatal(err)
					}
					if p.InvocationID != id || p.PlainText != "private answer" {
						t.Errorf("wrong reply payload %+v", p)
					}
				}
			}
		}
		if count != 3 {
			t.Errorf("%s credential used %d times", id, count)
		}
	}
	token, err := manager.GetAppToken(context.Background())
	if err != nil || token.AccessToken != "ordinary" {
		t.Fatalf("ordinary authority not restored: %v", err)
	}
}

func TestAppPersonFailClosedAndNoRefresh(t *testing.T) {
	called := false
	app := appsdk.New(appsdk.Options{AppID: "app"})
	app.Func("test", appsdk.HandleInput(func(ctx context.Context, fnCtx appsdk.Context, _ *struct{}) (any, error) {
		called = true
		return nil, nil
	}))
	for _, marker := range []string{`null`, `{}`, `{"invocationId":"one"}`, `{"invocationId":"one","accessToken":"ordinary"}`, `{"invocationId":"other","accessToken":"` + invocationContext("one").AppPersonInvocation.AccessToken + `"}`, `{"invocationId":"one","accessToken":"aph1.one.` + strings.Repeat("A", 42) + `B"}`} {
		response := app.HandleJSON(context.Background(), []byte(`{"method":"test","context":{"channel":{"id":"ch-one"},"appPersonInvocation":`+marker+`}}`))
		if response.Error == nil || called {
			t.Fatal("invalid marker reached handler")
		}
	}
	calls := 0
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) { calls++; w.WriteHeader(500) }))
	defer server.Close()
	client := native.NewClient(native.WithBaseURL(server.URL))
	manager := native.NewTokenManager(native.TokenManagerConfig{Client: client})
	ctx, err := appsdk.BindAppPersonInvocation(context.Background(), invocationContext("one"))
	if err != nil {
		t.Fatal(err)
	}
	if _, err = client.IssueToken(ctx, "secret"); err == nil {
		t.Error("issue allowed")
	}
	if _, err = client.RefreshToken(ctx, "refresh"); err == nil {
		t.Error("refresh allowed")
	}
	if _, err = manager.RefreshToken(ctx, "refresh"); err == nil {
		t.Error("manager refresh allowed")
	}
	if _, err = manager.GetChannelToken(ctx, "foreign"); err == nil {
		t.Error("foreign channel allowed")
	}
	if _, err = client.CallAppFunction(ctx, "ordinary", "app", "nested", nil, invocationContext("two"), ""); err == nil {
		t.Error("foreign invocation allowed")
	}
	if calls != 0 {
		t.Errorf("unexpected %d HTTP calls", calls)
	}
	if strings.Contains(fmt.Sprintf("%+v %#v", invocationContext("one"), invocationContext("one").AppPersonInvocation), "aph1.") {
		t.Error("credential leaked to fmt log")
	}
}

func TestAppPersonReplyProtoWireContract(t *testing.T) {
	input := native.ReplyToAppPersonInvocationParams{InvocationID: "one", PlainText: "private 😀 reply"}
	encoded, err := json.Marshal(input)
	if err != nil {
		t.Fatal(err)
	}
	var protoInput sdkv1.ReplyToAppPersonInvocationParams
	if err = protojson.Unmarshal(encoded, &protoInput); err != nil {
		t.Fatal(err)
	}
	if protoInput.GetInvocationId() != input.InvocationID || protoInput.GetPlainText() != input.PlainText {
		t.Fatal("request proto drift")
	}
	id := "desk-message"
	encoded, err = protojson.Marshal(&sdkv1.ReplyToAppPersonInvocationResult{Status: "published", DeskMessageId: &id})
	if err != nil {
		t.Fatal(err)
	}
	var result native.ReplyToAppPersonInvocationResult
	if err = json.Unmarshal(encoded, &result); err != nil {
		t.Fatal(err)
	}
	if result.Status != "published" || result.DeskMessageID == nil || *result.DeskMessageID != id {
		t.Fatal("reply receipt proto drift")
	}
}
