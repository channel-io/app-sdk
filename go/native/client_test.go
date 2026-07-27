package native_test

import (
	"context"
	"encoding/json"
	"io"
	"net/http"
	"strings"
	"testing"

	"github.com/channel-io/app-sdk/go/native"
)

func TestIssueToken(t *testing.T) {
	httpClient := &http.Client{Transport: roundTripFunc(func(r *http.Request) (*http.Response, error) {
		if r.URL.Path != "/general/v1/native/functions" {
			t.Fatalf("unexpected path: %s", r.URL.Path)
		}
		var req struct {
			Method string          `json:"method"`
			Params json.RawMessage `json:"params"`
		}
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			t.Fatal(err)
		}
		if req.Method != "issueToken" {
			t.Fatalf("unexpected method: %s", req.Method)
		}
		return &http.Response{
			StatusCode: http.StatusOK,
			Body:       io.NopCloser(strings.NewReader(`{"result":{"accessToken":"access","refreshToken":"refresh","expiresIn":3600}}`)),
			Header:     make(http.Header),
			Request:    r,
		}, nil
	})}

	client := native.NewClient(
		native.WithBaseURL("https://app-store.test"),
		native.WithHTTPClient(httpClient),
	)
	token, err := client.IssueToken(context.Background(), "secret")
	if err != nil {
		t.Fatal(err)
	}
	if token.AccessToken != "access" {
		t.Fatalf("unexpected access token: %s", token.AccessToken)
	}
}

func TestCreateAppDataTable(t *testing.T) {
	httpClient := &http.Client{Transport: roundTripFunc(func(r *http.Request) (*http.Response, error) {
		if r.URL.Path != "/general/v1/native/functions" {
			t.Fatalf("unexpected path: %s", r.URL.Path)
		}
		if got := r.Header.Get("x-access-token"); got != "app-token" {
			t.Fatalf("unexpected token: %s", got)
		}
		var req struct {
			Method string `json:"method"`
			Params struct {
				AppID             string                      `json:"appId"`
				TableName         string                      `json:"tableName"`
				Columns           []native.AppDataTableColumn `json:"columns"`
				PrimaryKeyColumns []string                    `json:"primaryKeyColumns"`
			} `json:"params"`
		}
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			t.Fatal(err)
		}
		if req.Method != "createAppDataTable" {
			t.Fatalf("unexpected method: %s", req.Method)
		}
		if req.Params.AppID != "app-1" || req.Params.TableName != "orders" {
			t.Fatalf("unexpected params: %+v", req.Params)
		}
		return &http.Response{
			StatusCode: http.StatusOK,
			Body:       io.NopCloser(strings.NewReader(`{"result":{"requestId":"req-1"}}`)),
			Header:     make(http.Header),
			Request:    r,
		}, nil
	})}

	client := native.NewClient(
		native.WithBaseURL("https://app-store.test"),
		native.WithHTTPClient(httpClient),
	)
	res, err := client.CreateAppDataTable(context.Background(), "app-token", native.CreateAppDataTableParams{
		AppID:             "app-1",
		TableName:         "orders",
		Columns:           []native.AppDataTableColumn{{Key: "id", Name: "ID", Type: "OPERATOR_TYPE_STRING"}},
		PrimaryKeyColumns: []string{"id"},
	})
	if err != nil {
		t.Fatal(err)
	}
	if res.RequestID != "req-1" {
		t.Fatalf("unexpected response: %+v", res)
	}
}

func TestRegisterAppNotebooks(t *testing.T) {
	httpClient := &http.Client{Transport: roundTripFunc(func(r *http.Request) (*http.Response, error) {
		if r.URL.Path != "/general/v1/native/functions" {
			t.Fatalf("unexpected path: %s", r.URL.Path)
		}
		if got := r.Header.Get("x-access-token"); got != "app-token" {
			t.Fatalf("unexpected token: %s", got)
		}
		var req struct {
			Method string `json:"method"`
			Params struct {
				AppID string `json:"appId"`
			} `json:"params"`
		}
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			t.Fatal(err)
		}
		if req.Method != "registerAppNotebooks" {
			t.Fatalf("unexpected method: %s", req.Method)
		}
		if req.Params.AppID != "app-1" {
			t.Fatalf("unexpected params: %+v", req.Params)
		}
		return &http.Response{
			StatusCode: http.StatusOK,
			Body:       io.NopCloser(strings.NewReader(`{"result":{"success":true,"syncRunId":"sync-1","status":"accepted","totalNotebooks":2,"createdCount":1,"updatedCount":1,"deletedCount":0}}`)),
			Header:     make(http.Header),
			Request:    r,
		}, nil
	})}

	client := native.NewClient(
		native.WithBaseURL("https://app-store.test"),
		native.WithHTTPClient(httpClient),
	)
	res, err := client.RegisterAppNotebooks(context.Background(), "app-token", "app-1")
	if err != nil {
		t.Fatal(err)
	}
	if !res.Success || res.SyncRunID != "sync-1" || res.TotalNotebooks != 2 {
		t.Fatalf("unexpected response: %+v", res)
	}
}

func TestGetAppNotebookVersions(t *testing.T) {
	httpClient := &http.Client{Transport: roundTripFunc(func(r *http.Request) (*http.Response, error) {
		if r.URL.Path != "/general/v1/native/functions" {
			t.Fatalf("unexpected path: %s", r.URL.Path)
		}
		if got := r.Header.Get("x-access-token"); got != "app-token" {
			t.Fatalf("unexpected token: %s", got)
		}
		var req struct {
			Method string `json:"method"`
			Params struct {
				AppID string `json:"appId"`
			} `json:"params"`
		}
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			t.Fatal(err)
		}
		if req.Method != "getAppNotebookVersions" {
			t.Fatalf("unexpected method: %s", req.Method)
		}
		if req.Params.AppID != "app-1" {
			t.Fatalf("unexpected params: %+v", req.Params)
		}
		return &http.Response{
			StatusCode: http.StatusOK,
			Body:       io.NopCloser(strings.NewReader(`{"result":{"success":true,"notebooks":[{"notebookKey":"sales","version":3,"latestRevisionId":"rev-1","updatedAt":"2026-07-13T00:00:00Z"}]}}`)),
			Header:     make(http.Header),
			Request:    r,
		}, nil
	})}

	client := native.NewClient(
		native.WithBaseURL("https://app-store.test"),
		native.WithHTTPClient(httpClient),
	)
	res, err := client.GetAppNotebookVersions(context.Background(), "app-token", "app-1")
	if err != nil {
		t.Fatal(err)
	}
	if !res.Success || len(res.Notebooks) != 1 || res.Notebooks[0].NotebookKey != "sales" {
		t.Fatalf("unexpected response: %+v", res)
	}
}

func TestUpsertAppDataTableRows(t *testing.T) {
	httpClient := &http.Client{Transport: roundTripFunc(func(r *http.Request) (*http.Response, error) {
		if r.URL.Path != "/general/v1/native/functions" {
			t.Fatalf("unexpected path: %s", r.URL.Path)
		}
		if got := r.Header.Get("x-access-token"); got != "app-token" {
			t.Fatalf("unexpected token: %s", got)
		}
		var req struct {
			Method string `json:"method"`
			Params struct {
				ChannelID string           `json:"channelId"`
				AppID     string           `json:"appId"`
				TableName string           `json:"tableName"`
				Rows      []map[string]any `json:"rows"`
			} `json:"params"`
		}
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			t.Fatal(err)
		}
		if req.Method != "upsertAppDataTableRows" {
			t.Fatalf("unexpected method: %s", req.Method)
		}
		if req.Params.ChannelID != "ch-1" || req.Params.AppID != "app-1" || req.Params.TableName != "orders" {
			t.Fatalf("unexpected params: %+v", req.Params)
		}
		if len(req.Params.Rows) != 1 || req.Params.Rows[0]["id"] != "order-1" {
			t.Fatalf("unexpected rows: %+v", req.Params.Rows)
		}
		return &http.Response{
			StatusCode: http.StatusOK,
			Body:       io.NopCloser(strings.NewReader(`{"result":{"requestId":"req-2","acceptedRowCount":1}}`)),
			Header:     make(http.Header),
			Request:    r,
		}, nil
	})}

	client := native.NewClient(
		native.WithBaseURL("https://app-store.test"),
		native.WithHTTPClient(httpClient),
	)
	res, err := client.UpsertAppDataTableRows(context.Background(), "app-token", native.UpsertAppDataTableRowsParams{
		ChannelID: "ch-1",
		AppID:     "app-1",
		TableName: "orders",
		Rows:      []map[string]any{{"id": "order-1", "channelId": "ch-1"}},
	})
	if err != nil {
		t.Fatal(err)
	}
	if res.RequestID != "req-2" || res.AcceptedRowCount != 1 {
		t.Fatalf("unexpected response: %+v", res)
	}
}

func TestCallNativeDecodesGenericResult(t *testing.T) {
	httpClient := &http.Client{Transport: roundTripFunc(func(r *http.Request) (*http.Response, error) {
		if r.Method != http.MethodPut || r.URL.Path != "/general/v1/native/functions" {
			t.Fatalf("unexpected request: %s %s", r.Method, r.URL.Path)
		}
		if got := r.Header.Get("x-access-token"); got != "channel-token" {
			t.Fatalf("unexpected token: %s", got)
		}
		var req struct {
			Method string         `json:"method"`
			Params map[string]any `json:"params"`
		}
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			t.Fatal(err)
		}
		if req.Method != "publicMethod" || req.Params["channelId"] != "channel-1" {
			t.Fatalf("unexpected payload: %+v", req)
		}
		return &http.Response{
			StatusCode: http.StatusOK,
			Body:       io.NopCloser(strings.NewReader(`{"result":{"value":"ok"}}`)),
			Header:     make(http.Header),
			Request:    r,
		}, nil
	})}

	client := native.NewClient(
		native.WithBaseURL("https://app-store.test"),
		native.WithHTTPClient(httpClient),
	)
	type result struct {
		Value string `json:"value"`
	}
	got, err := native.CallNative[result](
		context.Background(),
		client,
		"channel-token",
		"publicMethod",
		map[string]any{"channelId": "channel-1"},
	)
	if err != nil {
		t.Fatal(err)
	}
	if got.Value != "ok" {
		t.Fatalf("unexpected result: %+v", got)
	}
}

func TestProxyAPIWriteGroupMessage(t *testing.T) {
	httpClient := &http.Client{Transport: roundTripFunc(func(r *http.Request) (*http.Response, error) {
		var req struct {
			Method string `json:"method"`
			Params struct {
				ChannelID     string `json:"channelId"`
				GroupID       string `json:"groupId"`
				RootMessageID string `json:"rootMessageId"`
				Broadcast     bool   `json:"broadcast"`
				DTO           struct {
					PlainText string `json:"plainText"`
					BotName   string `json:"botName"`
				} `json:"dto"`
			} `json:"params"`
		}
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			t.Fatal(err)
		}
		if req.Method != native.FunctionWriteGroupMessage {
			t.Fatalf("unexpected method: %s", req.Method)
		}
		if req.Params.ChannelID != "channel-1" || req.Params.GroupID != "group-1" ||
			req.Params.RootMessageID != "root-1" || !req.Params.Broadcast ||
			req.Params.DTO.PlainText != "hello" || req.Params.DTO.BotName != "ExampleBot" {
			t.Fatalf("unexpected params: %+v", req.Params)
		}
		return &http.Response{
			StatusCode: http.StatusOK,
			Body:       io.NopCloser(strings.NewReader(`{"result":{"message":{"id":"message-1"}}}`)),
			Header:     make(http.Header),
			Request:    r,
		}, nil
	})}

	client := native.NewClient(
		native.WithBaseURL("https://app-store.test"),
		native.WithHTTPClient(httpClient),
	)
	got, err := client.CreateProxyAPI("channel-token").WriteGroupMessage(
		context.Background(),
		native.WriteGroupMessageParams{
			ChannelID:     "channel-1",
			GroupID:       "group-1",
			RootMessageID: "root-1",
			Broadcast:     true,
			DTO: native.WriteMessageDTO{
				PlainText: "hello",
				BotName:   "ExampleBot",
			},
		},
	)
	if err != nil {
		t.Fatal(err)
	}
	if got.Message["id"] != "message-1" {
		t.Fatalf("unexpected result: %+v", got)
	}
}

type roundTripFunc func(*http.Request) (*http.Response, error)

func (f roundTripFunc) RoundTrip(r *http.Request) (*http.Response, error) {
	return f(r)
}
