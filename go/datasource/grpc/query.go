package grpcdatasource

import (
	"context"
	stderrors "errors"
	"log/slog"
	"strings"
	"time"

	"github.com/channel-io/cht-app-sdk/go/datasource/arrowipc"
	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/status"
)

type QueryRequest struct {
	Session   *SessionContext
	SourceID  string
	Query     string
	RowLimit  int64
	ByteLimit int64
	TimeoutMS int64
}

type ExecutionResult struct {
	RowCount      int64
	LimitExceeded bool
	ExecutionMS   int64
}

type QueryChunkSender interface {
	SendArrowSchema(serializedSchema []byte) error
	SendArrowRecordBatch(serializedRecordBatch []byte) error
	SendExecutionResult(result ExecutionResult) error
}

type QueryExecutor interface {
	ExecuteQuery(ctx context.Context, req QueryRequest, sender QueryChunkSender) error
}

type QueryExecutorFunc func(ctx context.Context, req QueryRequest, sender QueryChunkSender) error

func (f QueryExecutorFunc) ExecuteQuery(ctx context.Context, req QueryRequest, sender QueryChunkSender) error {
	return f(ctx, req, sender)
}

type ExecuteQueryOption func(*executeQueryConfig)

type executeQueryConfig struct {
	logger      *slog.Logger
	statusRules []ErrorStatusRule
}

func WithExecuteQueryLogger(logger *slog.Logger) ExecuteQueryOption {
	return func(cfg *executeQueryConfig) {
		if logger != nil {
			cfg.logger = logger
		}
	}
}

type ErrorStatusRule struct {
	Code    codes.Code
	Needles []string
}

func ErrorContains(code codes.Code, needles ...string) ErrorStatusRule {
	normalized := make([]string, 0, len(needles))
	for _, needle := range needles {
		needle = strings.ToLower(strings.TrimSpace(needle))
		if needle != "" {
			normalized = append(normalized, needle)
		}
	}
	return ErrorStatusRule{Code: code, Needles: normalized}
}

func WithErrorStatusRules(rules ...ErrorStatusRule) ExecuteQueryOption {
	return func(cfg *executeQueryConfig) {
		cfg.statusRules = append(cfg.statusRules, rules...)
	}
}

func NewExecuteQueryHandler(executor QueryExecutor, opts ...ExecuteQueryOption) ExecuteQueryHandler {
	cfg := executeQueryConfig{logger: slog.Default()}
	for _, opt := range opts {
		if opt != nil {
			opt(&cfg)
		}
	}
	return func(req *ExecuteQueryRequest, stream ExecuteQueryServer) error {
		if executor == nil {
			return SendErrorAndReturn(stream, status.Error(codes.Unimplemented, "ExecuteQuery executor is not configured"))
		}

		startedAt := time.Now()
		err := executor.ExecuteQuery(Context(stream), QueryRequest{
			Session:   req.GetSession(),
			SourceID:  req.GetSourceId(),
			Query:     req.GetQuery(),
			RowLimit:  req.GetRowLimit(),
			ByteLimit: req.GetByteLimit(),
			TimeoutMS: req.GetTimeoutMs(),
		}, &streamQueryChunkSender{stream: stream, startedAt: startedAt})
		if err != nil {
			if cfg.logger != nil {
				cfg.logger.Warn("Datasource query execution failed", "sourceID", req.GetSourceId(), "err", err)
			}
			return SendErrorAndReturn(stream, statusFromQueryError(err, cfg.statusRules))
		}
		return nil
	}
}

type streamQueryChunkSender struct {
	stream    ExecuteQueryServer
	startedAt time.Time
}

func (s *streamQueryChunkSender) SendArrowSchema(serializedSchema []byte) error {
	return s.sendArrowMessage(serializedSchema)
}

func (s *streamQueryChunkSender) SendArrowRecordBatch(serializedRecordBatch []byte) error {
	return s.sendArrowMessage(serializedRecordBatch)
}

func (s *streamQueryChunkSender) sendArrowMessage(serializedMessage []byte) error {
	frame, err := arrowipc.SplitMessage(serializedMessage)
	if err != nil {
		return err
	}
	return s.stream.Send(ArrowChunk(frame.DataHeader, frame.DataBody))
}

func (s *streamQueryChunkSender) SendExecutionResult(result ExecutionResult) error {
	executionMS := result.ExecutionMS
	if executionMS <= 0 && !s.startedAt.IsZero() {
		executionMS = time.Since(s.startedAt).Milliseconds()
	}
	return s.stream.Send(ResultChunk(result.RowCount, result.LimitExceeded, executionMS))
}

func statusFromQueryError(err error, rules []ErrorStatusRule) error {
	if err == nil {
		return nil
	}
	if _, ok := QueryFailureDetail(err); ok {
		return err
	}
	if stderrors.Is(err, context.Canceled) {
		return status.Error(codes.Canceled, err.Error())
	}
	if stderrors.Is(err, context.DeadlineExceeded) {
		return status.Error(codes.DeadlineExceeded, err.Error())
	}
	if st, ok := status.FromError(err); ok && st.Code() != codes.Unknown {
		return err
	}

	message := err.Error()
	lower := strings.ToLower(message)
	for _, rule := range rules {
		for _, needle := range rule.Needles {
			if strings.Contains(lower, needle) {
				return status.Error(rule.Code, message)
			}
		}
	}
	return status.Error(codes.Internal, message)
}

type QueryLimitPolicy struct {
	DefaultRowLimit  int64
	MaxRowLimit      int64
	DefaultByteLimit int64
	MaxByteLimit     int64
	DefaultTimeoutMS int64
	MaxTimeoutMS     int64
}

var DefaultQueryLimitPolicy = QueryLimitPolicy{
	DefaultRowLimit:  100000,
	MaxRowLimit:      1000000,
	DefaultByteLimit: 256 * 1024 * 1024,
	MaxByteLimit:     2 * 1024 * 1024 * 1024,
	DefaultTimeoutMS: 60000,
	MaxTimeoutMS:     300000,
}

func NormalizeLimit(value int64, defaultValue int64, maxValue int64) int64 {
	if value <= 0 {
		return defaultValue
	}
	if maxValue > 0 && value > maxValue {
		return maxValue
	}
	return value
}

func InvalidArgument(message string) error {
	return status.Error(codes.InvalidArgument, message)
}

func SourceNotFound(message string) error {
	return status.Error(codes.NotFound, message)
}

func Unauthenticated(message string) error {
	return status.Error(codes.Unauthenticated, message)
}

func PermissionDenied(message string) error {
	return status.Error(codes.PermissionDenied, message)
}

func Unavailable(message string) error {
	return status.Error(codes.Unavailable, message)
}

func ResourceExhausted(message string) error {
	return status.Error(codes.ResourceExhausted, message)
}

func Timeout(message string) error {
	return status.Error(codes.DeadlineExceeded, message)
}

func Internal(message string) error {
	return status.Error(codes.Internal, message)
}
