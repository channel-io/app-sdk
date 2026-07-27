package grpcdatasource

import (
	"context"
	"crypto/hmac"
	"crypto/sha256"
	"encoding/base64"
	"encoding/binary"
	"encoding/hex"
	"encoding/json"
	"errors"
	"strings"
	"testing"

	datasourcev1 "github.com/channel-io/cht-app-sdk/go/internal/gen/io/channel/datasource/v1"
	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/metadata"
	"google.golang.org/grpc/status"
)

func TestNewExecuteQueryHandlerUsesExecutorAndSendsChunks(t *testing.T) {
	schemaMessage, schemaHeader, schemaBody := testArrowIPCMessage([]byte("schema-meta"), nil)
	batchMessage, batchHeader, batchBody := testArrowIPCMessage([]byte("batch-meta"), []byte("batch-body"))

	var captured QueryRequest
	handler := NewExecuteQueryHandler(QueryExecutorFunc(func(_ context.Context, req QueryRequest, sender QueryChunkSender) error {
		captured = req
		if err := sender.SendArrowSchema(schemaMessage); err != nil {
			return err
		}
		if err := sender.SendArrowRecordBatch(batchMessage); err != nil {
			return err
		}
		return sender.SendExecutionResult(ExecutionResult{RowCount: 2, LimitExceeded: true, ExecutionMS: 15})
	}))

	stream := &managedCaptureStream{ctx: context.Background()}
	err := handler(&ExecuteQueryRequest{
		Session:   &SessionContext{ChannelId: "channel-1"},
		SourceId:  "bigquery",
		Query:     "select 1",
		RowLimit:  10,
		ByteLimit: 20,
		TimeoutMs: 30,
	}, stream)
	if err != nil {
		t.Fatal(err)
	}
	if captured.SourceID != "bigquery" || captured.Query != "select 1" || captured.RowLimit != 10 || captured.ByteLimit != 20 || captured.TimeoutMS != 30 {
		t.Fatalf("unexpected captured request: %+v", captured)
	}
	if len(stream.chunks) != 3 {
		t.Fatalf("expected 3 chunks, got %d", len(stream.chunks))
	}
	if string(stream.chunks[0].GetArrow().GetDataHeader()) != string(schemaHeader) || string(stream.chunks[0].GetArrow().GetDataBody()) != string(schemaBody) {
		t.Fatalf("unexpected schema chunk: %+v", stream.chunks[0])
	}
	if string(stream.chunks[1].GetArrow().GetDataHeader()) != string(batchHeader) || string(stream.chunks[1].GetArrow().GetDataBody()) != string(batchBody) {
		t.Fatalf("unexpected batch chunk: %+v", stream.chunks[1])
	}
	if result := stream.chunks[2].GetResult(); result.GetRowCount() != 2 || !result.GetLimitExceeded() || result.GetExecutionMs() != 15 {
		t.Fatalf("unexpected result chunk: %+v", result)
	}
}

func testArrowIPCMessage(metadata []byte, body []byte) ([]byte, []byte, []byte) {
	metadataLen := len(metadata)
	if remainder := metadataLen % 8; remainder != 0 {
		metadataLen += 8 - remainder
	}

	header := make([]byte, 8+metadataLen)
	binary.LittleEndian.PutUint32(header[0:4], 0xFFFFFFFF)
	binary.LittleEndian.PutUint32(header[4:8], uint32(metadataLen))
	copy(header[8:], metadata)

	message := append(append([]byte(nil), header...), body...)
	return message, header, body
}

func TestNewExecuteQueryHandlerMapsErrorRules(t *testing.T) {
	handler := NewExecuteQueryHandler(
		QueryExecutorFunc(func(context.Context, QueryRequest, QueryChunkSender) error {
			return errors.New("query must be read-only")
		}),
		WithErrorStatusRules(ErrorContains(codes.InvalidArgument, "read-only")),
	)

	stream := &managedCaptureStream{ctx: context.Background()}
	err := handler(&ExecuteQueryRequest{
		Session:  &SessionContext{ChannelId: "channel-1"},
		SourceId: "bigquery",
		Query:    "delete from orders",
	}, stream)
	if status.Code(err) != codes.InvalidArgument {
		t.Fatalf("expected InvalidArgument, got %v: %v", status.Code(err), err)
	}
	if len(stream.chunks) != 1 || stream.chunks[0].GetError().GetCode().String() != "DATA_SOURCE_ERROR_CODE_INVALID_ARGUMENT" {
		t.Fatalf("unexpected error chunks: %+v", stream.chunks)
	}
}

func TestNewExecuteQueryHandlerPreservesStructuredQueryFailure(t *testing.T) {
	handler := NewExecuteQueryHandler(
		QueryExecutorFunc(func(context.Context, QueryRequest, QueryChunkSender) error {
			return QueryFailure(
				datasourcev1.DataSourceErrorCode_DATA_SOURCE_ERROR_CODE_LIMIT_EXCEEDED,
				"query exceeded bytes billed limit",
				errors.New("bigquery rejected query"),
				Retryable(false),
				Upstream("bigquery", "bytesBilledLimitExceeded", "query exceeded bytes billed limit"),
			)
		}),
	)

	stream := &managedCaptureStream{ctx: context.Background()}
	err := handler(&ExecuteQueryRequest{
		Session:  &SessionContext{ChannelId: "channel-1"},
		SourceId: "bigquery",
		Query:    "select * from orders",
	}, stream)
	if status.Code(err) != codes.ResourceExhausted {
		t.Fatalf("expected ResourceExhausted, got %v: %v", status.Code(err), err)
	}
	if len(stream.chunks) != 1 {
		t.Fatalf("expected one terminal error chunk, got %d", len(stream.chunks))
	}
	detail := stream.chunks[0].GetError()
	if detail.GetCode() != datasourcev1.DataSourceErrorCode_DATA_SOURCE_ERROR_CODE_LIMIT_EXCEEDED || detail.GetRetryable() {
		t.Fatalf("unexpected error detail: %+v", detail)
	}
	if detail.GetUpstream().GetEngine() != "bigquery" || detail.GetUpstream().GetCode() != "bytesBilledLimitExceeded" {
		t.Fatalf("unexpected upstream detail: %+v", detail.GetUpstream())
	}
}

func TestDatasourceRouteFromContext(t *testing.T) {
	ctx := metadata.NewIncomingContext(context.Background(), metadata.Pairs(DatasourceRouteMetadataKey, " cafe24 "))

	if got := DatasourceRouteFromContext(ctx); got != "cafe24" {
		t.Fatalf("expected cafe24 route, got %q", got)
	}
}

func TestRoutedQueryExecutorRoutesByDatasourceRoute(t *testing.T) {
	var called string
	executor := NewRoutedQueryExecutor(map[string]QueryExecutor{
		"cafe24": QueryExecutorFunc(func(_ context.Context, _ QueryRequest, sender QueryChunkSender) error {
			called = "cafe24"
			return sender.SendExecutionResult(ExecutionResult{RowCount: 1})
		}),
		"shopify": QueryExecutorFunc(func(_ context.Context, _ QueryRequest, sender QueryChunkSender) error {
			called = "shopify"
			return sender.SendExecutionResult(ExecutionResult{RowCount: 2})
		}),
	})

	ctx := metadata.NewIncomingContext(context.Background(), metadata.Pairs(DatasourceRouteMetadataKey, "shopify"))
	stream := &managedCaptureStream{ctx: ctx}
	err := executor.ExecuteQuery(ctx, QueryRequest{SourceID: "bigquery"}, &streamQueryChunkSender{stream: stream})
	if err != nil {
		t.Fatal(err)
	}
	if called != "shopify" {
		t.Fatalf("expected shopify executor, got %q", called)
	}
	if len(stream.chunks) != 1 || stream.chunks[0].GetResult().GetRowCount() != 2 {
		t.Fatalf("unexpected chunks: %+v", stream.chunks)
	}
}

func TestRoutedQueryExecutorRejectsUnknownRoute(t *testing.T) {
	executor := NewRoutedQueryExecutor(map[string]QueryExecutor{
		"cafe24": QueryExecutorFunc(func(context.Context, QueryRequest, QueryChunkSender) error {
			t.Fatal("executor must not be called")
			return nil
		}),
	})

	ctx := metadata.NewIncomingContext(context.Background(), metadata.Pairs(DatasourceRouteMetadataKey, "shopify"))
	err := executor.ExecuteQuery(ctx, QueryRequest{SourceID: "bigquery"}, &streamQueryChunkSender{stream: &managedCaptureStream{ctx: ctx}})
	if status.Code(err) != codes.NotFound {
		t.Fatalf("expected NotFound, got %v: %v", status.Code(err), err)
	}
}

func TestManagedServerRequiresAuthTokenWhenConfigured(t *testing.T) {
	server := NewManagedServer(nil, ManagedServerConfig{
		Enabled:      true,
		Port:         "0",
		AuthRequired: true,
	})

	err := server.Start(context.Background())
	if err == nil {
		t.Fatal("expected missing auth token to fail")
	}
}

func TestManagedServerRejectsInvalidDatasourceToken(t *testing.T) {
	token := "wrong"
	server := NewManagedServer(
		func(_ *ExecuteQueryRequest, _ ExecuteQueryServer) error {
			t.Fatal("handler must not be called")
			return nil
		},
		ManagedServerConfig{
			AuthToken:    "secret",
			AuthRequired: true,
		},
	)

	stream := &managedCaptureStream{ctx: context.Background()}
	err := server.withAuth(func(_ *ExecuteQueryRequest, _ ExecuteQueryServer) error {
		t.Fatal("handler must not be called")
		return nil
	})(&ExecuteQueryRequest{
		Session:  &SessionContext{ChannelId: "channel-1", DatasourceToken: &token},
		SourceId: "bigquery",
		Query:    "select 1",
	}, stream)
	if status.Code(err) != codes.Unauthenticated {
		t.Fatalf("expected Unauthenticated, got %v: %v", status.Code(err), err)
	}
	if len(stream.chunks) != 1 || stream.chunks[0].GetError().GetCode().String() != "DATA_SOURCE_ERROR_CODE_UNAUTHENTICATED" {
		t.Fatalf("unexpected error chunks: %+v", stream.chunks)
	}
}

func TestManagedServerValidatesAccessTokenMetadata(t *testing.T) {
	var captured AccessTokenIdentity
	server := NewManagedServer(
		func(_ *ExecuteQueryRequest, stream ExecuteQueryServer) error {
			var ok bool
			captured, ok = AccessTokenIdentityFromContext(stream.Context())
			if !ok {
				t.Fatal("expected access token identity in context")
			}
			return nil
		},
		ManagedServerConfig{
			AccessTokenValidator: AccessTokenValidatorFunc(func(_ context.Context, token string) (AccessTokenIdentity, error) {
				if token != "access-token" {
					t.Fatalf("unexpected access token: %q", token)
				}
				return AccessTokenIdentity{AccessToken: token, AppID: "cafe24", ChannelID: "channel-1", ManagerID: "manager-1"}, nil
			}),
			AuthRequired: true,
		},
	)

	ctx := metadata.NewIncomingContext(context.Background(), metadata.Pairs(AccessTokenMetadataKey, "access-token"))
	err := server.withAuth(func(_ *ExecuteQueryRequest, stream ExecuteQueryServer) error {
		var ok bool
		captured, ok = AccessTokenIdentityFromContext(stream.Context())
		if !ok {
			t.Fatal("expected access token identity in context")
		}
		return nil
	})(&ExecuteQueryRequest{Session: &SessionContext{ChannelId: "channel-1"}, SourceId: "bigquery", Query: "select 1"}, &managedCaptureStream{ctx: ctx})
	if err != nil {
		t.Fatal(err)
	}
	if captured.AppID != "cafe24" || captured.ChannelID != "channel-1" || captured.ManagerID != "manager-1" {
		t.Fatalf("unexpected identity: %+v", captured)
	}
}

func TestManagedServerRejectsMissingAccessTokenMetadata(t *testing.T) {
	server := NewManagedServer(
		func(_ *ExecuteQueryRequest, _ ExecuteQueryServer) error {
			t.Fatal("handler must not be called")
			return nil
		},
		ManagedServerConfig{
			AccessTokenValidator: AccessTokenValidatorFunc(func(context.Context, string) (AccessTokenIdentity, error) {
				t.Fatal("validator must not be called")
				return AccessTokenIdentity{}, nil
			}),
			AuthRequired: true,
		},
	)

	err := server.withAuth(func(_ *ExecuteQueryRequest, _ ExecuteQueryServer) error {
		t.Fatal("handler must not be called")
		return nil
	})(&ExecuteQueryRequest{Session: &SessionContext{ChannelId: "channel-1"}, SourceId: "bigquery", Query: "select 1"}, &managedCaptureStream{ctx: context.Background()})
	if status.Code(err) != codes.Unauthenticated {
		t.Fatalf("expected Unauthenticated, got %v: %v", status.Code(err), err)
	}
}

func TestManagedServerValidatesHMACSignatureWithSigningKey(t *testing.T) {
	signingKey := hex.EncodeToString([]byte("datasource-signing-key"))
	accessToken := signedJWT(t, "auth-secret", map[string]any{
		"identity": "app-cafe24",
		"scope":    []string{"app-cafe24", "channel-channel-1", "manager-manager-1"},
	})
	req := &ExecuteQueryRequest{Session: &SessionContext{ChannelId: "channel-1"}, SourceId: "bigquery", Query: "select 1"}
	signature := signDatasourceRequest(t, signingKey, req, accessToken)
	server := NewManagedServer(
		func(_ *ExecuteQueryRequest, stream ExecuteQueryServer) error {
			identity, ok := AccessTokenIdentityFromContext(stream.Context())
			if !ok {
				t.Fatal("expected access token identity in context")
			}
			if identity.AppID != "cafe24" || identity.ChannelID != "channel-1" || identity.ManagerID != "manager-1" {
				t.Fatalf("unexpected identity: %+v", identity)
			}
			return nil
		},
		ManagedServerConfig{SigningKey: signingKey, AuthRequired: true},
	)

	ctx := metadata.NewIncomingContext(context.Background(), metadata.Pairs(
		AccessTokenMetadataKey, accessToken,
		SignatureMetadataKey, signature,
	))
	err := server.withAuth(func(_ *ExecuteQueryRequest, stream ExecuteQueryServer) error {
		_, ok := AccessTokenIdentityFromContext(stream.Context())
		if !ok {
			t.Fatal("expected access token identity in context")
		}
		return nil
	})(req, &managedCaptureStream{ctx: ctx})
	if err != nil {
		t.Fatal(err)
	}
}

func TestManagedServerResolvesSigningKeyFromAccessTokenIdentity(t *testing.T) {
	signingKey := hex.EncodeToString([]byte("datasource-signing-key"))
	accessToken := signedJWT(t, "auth-secret", map[string]any{
		"identity": "app-cafe24",
		"scope":    []string{"app-cafe24", "channel-channel-1", "manager-manager-1"},
	})
	req := &ExecuteQueryRequest{Session: &SessionContext{ChannelId: "channel-1"}, SourceId: "bigquery", Query: "select 1"}
	server := NewManagedServer(
		func(_ *ExecuteQueryRequest, stream ExecuteQueryServer) error {
			identity, ok := AccessTokenIdentityFromContext(stream.Context())
			if !ok {
				t.Fatal("expected access token identity in context")
			}
			if identity.AppID != "cafe24" {
				t.Fatalf("unexpected identity: %+v", identity)
			}
			return nil
		},
		ManagedServerConfig{
			SigningKeyResolver: func(_ context.Context, identity AccessTokenIdentity) (string, error) {
				if identity.AppID != "cafe24" {
					t.Fatalf("unexpected resolver identity: %+v", identity)
				}
				return signingKey, nil
			},
			AuthRequired: true,
		},
	)

	ctx := metadata.NewIncomingContext(context.Background(), metadata.Pairs(
		AccessTokenMetadataKey, accessToken,
		SignatureMetadataKey, signDatasourceRequest(t, signingKey, req, accessToken),
	))
	err := server.withAuth(func(_ *ExecuteQueryRequest, stream ExecuteQueryServer) error {
		_, ok := AccessTokenIdentityFromContext(stream.Context())
		if !ok {
			t.Fatal("expected access token identity in context")
		}
		return nil
	})(req, &managedCaptureStream{ctx: ctx})
	if err != nil {
		t.Fatal(err)
	}
}

func TestManagedServerRejectsInvalidHMACSignature(t *testing.T) {
	signingKey := hex.EncodeToString([]byte("datasource-signing-key"))
	accessToken := signedJWT(t, "auth-secret", map[string]any{
		"identity": "app-cafe24",
		"scope":    []string{"app-cafe24", "channel-channel-1", "manager-manager-1"},
	})
	req := &ExecuteQueryRequest{Session: &SessionContext{ChannelId: "channel-1"}, SourceId: "bigquery", Query: "select 1"}
	server := NewManagedServer(
		func(_ *ExecuteQueryRequest, _ ExecuteQueryServer) error {
			t.Fatal("handler must not be called")
			return nil
		},
		ManagedServerConfig{SigningKey: signingKey, AuthRequired: true},
	)

	ctx := metadata.NewIncomingContext(context.Background(), metadata.Pairs(
		AccessTokenMetadataKey, accessToken,
		SignatureMetadataKey, signDatasourceRequest(t, signingKey, req, accessToken+"tampered"),
	))
	err := server.withAuth(func(_ *ExecuteQueryRequest, _ ExecuteQueryServer) error {
		t.Fatal("handler must not be called")
		return nil
	})(req, &managedCaptureStream{ctx: ctx})
	if status.Code(err) != codes.Unauthenticated {
		t.Fatalf("expected Unauthenticated, got %v: %v", status.Code(err), err)
	}
}

func TestParseJWTAccessToken(t *testing.T) {
	token := signedJWT(t, "secret", map[string]any{
		"identity": "app-cafe24",
		"scope":    []string{"app-cafe24", "channel-channel-1", "manager-manager-1"},
	})

	identity, err := ParseJWTAccessToken(token, "secret")

	if err != nil {
		t.Fatal(err)
	}
	if identity.AppID != "cafe24" || identity.ChannelID != "channel-1" || identity.ManagerID != "manager-1" {
		t.Fatalf("unexpected identity: %+v", identity)
	}
	if identity.CallerType != "app" || identity.CallerID != "cafe24" {
		t.Fatalf("unexpected caller: %+v", identity)
	}
}

func TestNormalizeLimit(t *testing.T) {
	if got := NormalizeLimit(0, 10, 100); got != 10 {
		t.Fatalf("expected default, got %d", got)
	}
	if got := NormalizeLimit(200, 10, 100); got != 100 {
		t.Fatalf("expected max, got %d", got)
	}
	if got := NormalizeLimit(20, 10, 100); got != 20 {
		t.Fatalf("expected value, got %d", got)
	}
}

type managedCaptureStream struct {
	ctx    context.Context
	chunks []*QueryChunk
}

func (c *managedCaptureStream) Send(chunk *QueryChunk) error {
	c.chunks = append(c.chunks, chunk)
	return nil
}

func (c *managedCaptureStream) SetHeader(metadata.MD) error  { return nil }
func (c *managedCaptureStream) SendHeader(metadata.MD) error { return nil }
func (c *managedCaptureStream) SetTrailer(metadata.MD)       {}
func (c *managedCaptureStream) Context() context.Context     { return c.ctx }
func (c *managedCaptureStream) SendMsg(any) error            { return nil }
func (c *managedCaptureStream) RecvMsg(any) error            { return nil }

func signedJWT(t *testing.T, secret string, payload map[string]any) string {
	t.Helper()
	headerJSON, err := json.Marshal(map[string]string{"alg": "HS256", "typ": "JWT"})
	if err != nil {
		t.Fatal(err)
	}
	payloadJSON, err := json.Marshal(payload)
	if err != nil {
		t.Fatal(err)
	}
	header := base64.RawURLEncoding.EncodeToString(headerJSON)
	body := base64.RawURLEncoding.EncodeToString(payloadJSON)
	unsigned := header + "." + body
	mac := hmac.New(sha256.New, []byte(secret))
	_, _ = mac.Write([]byte(unsigned))
	signature := base64.RawURLEncoding.EncodeToString(mac.Sum(nil))
	return strings.Join([]string{header, body, signature}, ".")
}

func signDatasourceRequest(t *testing.T, signingKey string, req *ExecuteQueryRequest, accessToken string) string {
	t.Helper()
	key, err := hex.DecodeString(signingKey)
	if err != nil {
		t.Fatal(err)
	}
	payload, err := DataSourceSignaturePayload(req, accessToken)
	if err != nil {
		t.Fatal(err)
	}
	mac := hmac.New(sha256.New, key)
	_, _ = mac.Write(payload)
	return base64.StdEncoding.EncodeToString(mac.Sum(nil))
}
