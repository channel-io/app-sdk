package gin_test

import (
	"bytes"
	"context"
	"crypto/hmac"
	"crypto/sha256"
	"encoding/base64"
	"encoding/hex"
	"encoding/json"
	"io"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"

	"github.com/channel-io/app-sdk/go/appsdk"
	"github.com/channel-io/app-sdk/go/extension/oauth"
	"github.com/channel-io/app-sdk/go/native"
	sdkgin "github.com/channel-io/app-sdk/go/server/gin"
	ginlib "github.com/gin-gonic/gin"
)

type echoInput struct {
	Message string `json:"message"`
}

type echoOutput struct {
	Message string `json:"message"`
}

type requestHandlerFunc func(context.Context, appsdk.FunctionRequest) appsdk.FunctionResponse

func (f requestHandlerFunc) HandleRequest(ctx context.Context, req appsdk.FunctionRequest) appsdk.FunctionResponse {
	return f(ctx, req)
}

func TestResolverPanicDoesNotReachHTTPRecoveryLogs(t *testing.T) {
	var logs bytes.Buffer
	oldWriter, oldErrorWriter := ginlib.DefaultWriter, ginlib.DefaultErrorWriter
	ginlib.DefaultWriter, ginlib.DefaultErrorWriter = &logs, &logs
	t.Cleanup(func() {
		ginlib.DefaultWriter, ginlib.DefaultErrorWriter = oldWriter, oldErrorWriter
	})
	app := appsdk.New(appsdk.Options{AppID: "app"})
	if err := app.Use(oauth.Extension().ResolveAuthConfig(func(context.Context, appsdk.Context, *oauth.ResolveAuthConfigInput) (*oauth.ResolveAuthConfigOutput, error) {
		panic("synthetic-private-resolver-marker")
	})); err != nil {
		t.Fatal(err)
	}
	server := sdkgin.NewServer(app)
	body := `{"method":"extension.oauth.connection.resolveAuthConfig","params":{}}`
	response := httptest.NewRecorder()
	server.Engine().ServeHTTP(response, httptest.NewRequest(http.MethodPut, "/functions/v1", strings.NewReader(body)))
	if strings.Contains(logs.String(), "synthetic-private-resolver-marker") || strings.Contains(response.Body.String(), "synthetic-private-resolver-marker") {
		t.Fatal("resolver panic exposed a secret in HTTP logs or response")
	}
	if response.Code != http.StatusOK {
		t.Fatalf("expected a JSON-RPC error response, got HTTP %d", response.Code)
	}
	var result appsdk.FunctionResponse
	if err := json.Unmarshal(response.Body.Bytes(), &result); err != nil {
		t.Fatal(err)
	}
	if result.Error == nil || result.Error.Code != appsdk.CodeInternal || result.Error.Message != "internal error" || len(result.Result) != 0 {
		t.Fatalf("expected a sanitized resolver failure: %+v", result)
	}
}

func TestHandlerVerifiesTypeScriptCompatibleSignature(t *testing.T) {
	ginlib.SetMode(ginlib.TestMode)
	app := newEchoApp(t)
	signingKey := hex.EncodeToString([]byte("secret"))
	handler := sdkgin.New(app, sdkgin.WithSignature(signingKey))

	body := []byte(`{"method":"extension.test.echo","params":{"message":"hello"},"context":{"channel":{"id":"channel"}}}`)
	req := httptest.NewRequest(http.MethodPut, "/functions/v1", bytes.NewReader(body))
	req.Header.Set("x-signature", sign(signingKey, body))
	rec := httptest.NewRecorder()
	ctx, _ := ginlib.CreateTestContext(rec)
	ctx.Request = req

	handler.Handle(ctx)

	if rec.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d: %s", rec.Code, rec.Body.String())
	}
	var response appsdk.FunctionResponse
	if err := json.Unmarshal(rec.Body.Bytes(), &response); err != nil {
		t.Fatal(err)
	}
	if response.Error != nil {
		t.Fatalf("unexpected error: %+v", response.Error)
	}
}

func TestHandlerRejectsInvalidSignature(t *testing.T) {
	ginlib.SetMode(ginlib.TestMode)
	handler := sdkgin.New(newEchoApp(t), sdkgin.WithSignature(hex.EncodeToString([]byte("secret"))))

	req := httptest.NewRequest(http.MethodPut, "/functions/v1", bytes.NewReader([]byte(`{}`)))
	req.Header.Set("x-signature", "bad")
	rec := httptest.NewRecorder()
	ctx, _ := ginlib.CreateTestContext(rec)
	ctx.Request = req

	handler.Handle(ctx)

	if rec.Code != http.StatusUnauthorized {
		t.Fatalf("expected 401, got %d", rec.Code)
	}
}

func TestHandlerUsesCustomSignatureError(t *testing.T) {
	ginlib.SetMode(ginlib.TestMode)
	handler := sdkgin.New(newEchoApp(t),
		sdkgin.WithSignature(hex.EncodeToString([]byte("secret"))),
		sdkgin.WithSignatureError(http.StatusBadRequest, ginlib.H{"error": "Signature mismatch"}),
	)

	req := httptest.NewRequest(http.MethodPut, "/functions/v1", bytes.NewReader([]byte(`{}`)))
	req.Header.Set("x-signature", "bad")
	rec := httptest.NewRecorder()
	ctx, _ := ginlib.CreateTestContext(rec)
	ctx.Request = req

	handler.Handle(ctx)

	if rec.Code != http.StatusBadRequest {
		t.Fatalf("expected 400, got %d", rec.Code)
	}
	var body map[string]string
	if err := json.Unmarshal(rec.Body.Bytes(), &body); err != nil {
		t.Fatal(err)
	}
	if body["error"] != "Signature mismatch" {
		t.Fatalf("unexpected body: %s", rec.Body.String())
	}
}

func TestHandlerUsesRequestContextHook(t *testing.T) {
	ginlib.SetMode(ginlib.TestMode)
	type contextKey string
	key := contextKey("language")
	handler := sdkgin.NewHandler(
		requestHandlerFunc(func(ctx context.Context, req appsdk.FunctionRequest) appsdk.FunctionResponse {
			if got := ctx.Value(key); got != "ko" {
				t.Fatalf("expected request context hook value, got %#v", got)
			}
			return appsdk.FunctionResponse{Result: json.RawMessage(`{"ok":true}`)}
		}),
		sdkgin.WithRequestContext(func(ctx context.Context, body []byte) context.Context {
			var req appsdk.FunctionRequest
			if err := json.Unmarshal(body, &req); err != nil {
				return ctx
			}
			var params struct {
				Language string `json:"language"`
			}
			_ = json.Unmarshal(req.Params, &params)
			return context.WithValue(ctx, key, params.Language)
		}),
	)

	body := []byte(`{"method":"extension.test.echo","params":{"language":"ko"},"context":{"channel":{"id":"channel"}}}`)
	req := httptest.NewRequest(http.MethodPut, "/functions/v1", bytes.NewReader(body))
	rec := httptest.NewRecorder()
	ctx, _ := ginlib.CreateTestContext(rec)
	ctx.Request = req

	handler.Handle(ctx)

	if rec.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d: %s", rec.Code, rec.Body.String())
	}
}

func TestServerMountsDefaultRoute(t *testing.T) {
	ginlib.SetMode(ginlib.TestMode)
	engine := ginlib.New()
	server := sdkgin.NewServer(newEchoApp(t), sdkgin.WithEngine(engine))

	body := []byte(`{"method":"extension.test.echo","params":{"message":"hello"},"context":{"channel":{"id":"channel"}}}`)
	req := httptest.NewRequest(http.MethodPut, "/functions/v1", bytes.NewReader(body))
	rec := httptest.NewRecorder()

	server.Engine().ServeHTTP(rec, req)

	if rec.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d: %s", rec.Code, rec.Body.String())
	}
}

func TestRouteMountsCustomVersionRoute(t *testing.T) {
	ginlib.SetMode(ginlib.TestMode)
	engine := ginlib.New()
	route := sdkgin.NewRoute(newEchoApp(t), sdkgin.WithRoute("/function/:version"))
	route.Mount(engine)

	if route.Path() != "/function/:version" {
		t.Fatalf("unexpected route path: %s", route.Path())
	}

	body := []byte(`{"method":"extension.test.echo","params":{"message":"hello"},"context":{"channel":{"id":"channel"}}}`)
	req := httptest.NewRequest(http.MethodPut, "/function/v1", bytes.NewReader(body))
	rec := httptest.NewRecorder()

	engine.ServeHTTP(rec, req)

	if rec.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d: %s", rec.Code, rec.Body.String())
	}
	var response appsdk.FunctionResponse
	if err := json.Unmarshal(rec.Body.Bytes(), &response); err != nil {
		t.Fatal(err)
	}
	if response.Error != nil {
		t.Fatalf("unexpected error: %+v", response.Error)
	}
}

func TestHandlerAutoRegisterRetryConfigUsesNativeRegistrar(t *testing.T) {
	app := appsdk.New(appsdk.Options{AppID: "app-id", AppSecret: "secret"})
	if err := app.DeclareExtension("config", "v1"); err != nil {
		t.Fatal(err)
	}

	registerCalls := 0
	httpClient := &http.Client{Transport: roundTripFunc(func(r *http.Request) (*http.Response, error) {
		var req struct {
			Method string `json:"method"`
		}
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			t.Fatal(err)
		}
		switch req.Method {
		case "issueToken":
			return okJSON(r, `{"result":{"accessToken":"access","refreshToken":"refresh","expiresIn":3600}}`), nil
		case "registerExtension":
			registerCalls++
			return okJSON(r, `{"result":{"success":false,"errorMessage":"still starting"}}`), nil
		default:
			t.Fatalf("unexpected method: %s", req.Method)
			return nil, nil
		}
	})}
	client := native.NewClient(native.WithBaseURL("https://app-store.test"), native.WithHTTPClient(httpClient))
	handler := sdkgin.New(app,
		sdkgin.WithAutoRegister(sdkgin.WithAutoRegisterClient(client)),
		sdkgin.WithAutoRegisterRetry(2, time.Nanosecond),
	)

	results := handler.AutoRegister(context.Background())

	if registerCalls != 2 {
		t.Fatalf("expected retry config to run in the native registrar, got %d register calls", registerCalls)
	}
	if len(results) != 1 || results[0].Success || results[0].Error != "still starting" {
		t.Fatalf("unexpected exhausted results: %+v", results)
	}
}

func newEchoApp(t *testing.T) *appsdk.App {
	t.Helper()
	app := appsdk.New(appsdk.Options{AppID: "app"})
	if err := appsdk.Register(app, "extension.test.echo", func(_ context.Context, _ appsdk.Context, in *echoInput) (*echoOutput, error) {
		return &echoOutput{Message: in.Message}, nil
	}); err != nil {
		t.Fatal(err)
	}
	return app
}

func sign(signingKey string, body []byte) string {
	key, _ := hex.DecodeString(signingKey)
	mac := hmac.New(sha256.New, key)
	_, _ = mac.Write(body)
	return base64.StdEncoding.EncodeToString(mac.Sum(nil))
}

type roundTripFunc func(*http.Request) (*http.Response, error)

func (f roundTripFunc) RoundTrip(r *http.Request) (*http.Response, error) {
	return f(r)
}

func okJSON(req *http.Request, body string) *http.Response {
	return &http.Response{
		StatusCode: http.StatusOK,
		Body:       io.NopCloser(strings.NewReader(body)),
		Header:     make(http.Header),
		Request:    req,
	}
}
