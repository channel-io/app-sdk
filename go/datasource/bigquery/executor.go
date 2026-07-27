package bigquery

import (
	"context"
	stderrors "errors"
	"fmt"
	"io"
	"log/slog"
	"os"
	"strings"
	"time"

	cloudbigquery "cloud.google.com/go/bigquery"
	storage "cloud.google.com/go/bigquery/storage/apiv1"
	"cloud.google.com/go/bigquery/storage/apiv1/storagepb"
	"github.com/channel-io/cht-app-sdk/go/datasource"
	grpcdatasource "github.com/channel-io/cht-app-sdk/go/datasource/grpc"
	datasourcev1 "github.com/channel-io/cht-app-sdk/go/internal/gen/io/channel/datasource/v1"
	"golang.org/x/oauth2/google"
	bqapi "google.golang.org/api/bigquery/v2"
	"google.golang.org/api/googleapi"
	"google.golang.org/api/option"
	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/status"
)

type Config struct {
	ProjectID          string
	CredentialsJSON    string
	CredentialsEnvVars []string
	Sources            []SourceConfig
	Logger             *slog.Logger
}

type SourceConfig struct {
	SourceID  string
	ProjectID string
	DatasetID string
	Tables    []datasource.TableConfig
}

type Executor struct {
	bq        *cloudbigquery.Client
	bqService *bqapi.Service
	reader    *storage.BigQueryReadClient
	sources   map[string]SourceConfig
	logger    *slog.Logger
}

type tableRef struct {
	projectID string
	datasetID string
	tableID   string
}

func NewExecutor(ctx context.Context, cfg Config) (*Executor, error) {
	if ctx == nil {
		ctx = context.Background()
	}
	projectID := strings.TrimSpace(cfg.ProjectID)
	if projectID == "" {
		return nil, fmt.Errorf("bigquery project_id is required")
	}
	if len(cfg.Sources) == 0 {
		return nil, fmt.Errorf("at least one BigQuery datasource source is required")
	}

	opts, err := clientOptions(ctx, cfg)
	if err != nil {
		return nil, err
	}
	bq, err := cloudbigquery.NewClient(ctx, projectID, opts...)
	if err != nil {
		return nil, err
	}
	reader, err := storage.NewBigQueryReadClient(ctx, opts...)
	if err != nil {
		_ = bq.Close()
		return nil, err
	}
	bqService, err := bqapi.NewService(ctx, opts...)
	if err != nil {
		_ = reader.Close()
		_ = bq.Close()
		return nil, err
	}

	executor := &Executor{
		bq:        bq,
		bqService: bqService,
		reader:    reader,
		sources:   make(map[string]SourceConfig, len(cfg.Sources)),
		logger:    cfg.Logger,
	}
	if executor.logger == nil {
		executor.logger = slog.Default().With("component", "datasource.bigquery")
	}
	for _, source := range cfg.Sources {
		normalized, err := normalizeSourceConfig(source, projectID)
		if err != nil {
			_ = executor.Close()
			return nil, err
		}
		if _, exists := executor.sources[normalized.SourceID]; exists {
			_ = executor.Close()
			return nil, fmt.Errorf("duplicate datasource source_id: %s", normalized.SourceID)
		}
		executor.sources[normalized.SourceID] = normalized
	}
	return executor, nil
}

func (e *Executor) ExecuteQuery(ctx context.Context, req grpcdatasource.QueryRequest, sender grpcdatasource.QueryChunkSender) error {
	if e == nil {
		return grpcdatasource.Internal("BigQuery datasource executor is not configured")
	}
	source, ok := e.sources[strings.TrimSpace(req.SourceID)]
	if !ok {
		return grpcdatasource.SourceNotFound(fmt.Sprintf("unknown datasource source_id: %s", req.SourceID))
	}
	if err := datasource.ValidateReadOnlyQuery(req.Query, nil, source.Tables); err != nil {
		return grpcdatasource.InvalidArgument(err.Error())
	}
	if req.TimeoutMS > 0 {
		var cancel context.CancelFunc
		ctx, cancel = context.WithTimeout(ctx, time.Duration(req.TimeoutMS)*time.Millisecond)
		defer cancel()
	}

	startedAt := time.Now()
	query := e.bq.Query(datasource.QueryWithRowLimit(req.Query, req.RowLimit))
	query.DefaultProjectID = source.ProjectID
	query.DefaultDatasetID = source.DatasetID
	query.DisableQueryCache = true
	query.UseLegacySQL = false
	query.MaxBytesBilled = req.ByteLimit
	if req.TimeoutMS > 0 {
		query.JobTimeout = time.Duration(req.TimeoutMS) * time.Millisecond
	}
	query.Labels = map[string]string{"component": "datasource"}

	job, err := query.Run(ctx)
	if err != nil {
		return classifyUpstreamError(err)
	}
	status, err := job.Wait(ctx)
	if err != nil {
		return classifyUpstreamError(err)
	}
	if err := status.Err(); err != nil {
		return classifyUpstreamError(err)
	}

	destination, err := e.queryDestinationTable(ctx, job.ProjectID(), job.ID(), job.Location())
	if err != nil {
		return err
	}
	rowCount, bytesScanned, err := e.readTable(ctx, destination, sender)
	if err != nil {
		return err
	}
	e.logger.DebugContext(ctx, "BigQuery datasource query finished", "sourceID", req.SourceID, "rows", rowCount, "bytesScanned", bytesScanned)
	return sender.SendExecutionResult(grpcdatasource.ExecutionResult{
		RowCount:    rowCount,
		ExecutionMS: time.Since(startedAt).Milliseconds(),
	})
}

func (e *Executor) Close() error {
	if e == nil {
		return nil
	}
	var closeErr error
	if e.reader != nil {
		closeErr = e.reader.Close()
	}
	if e.bq != nil {
		if err := e.bq.Close(); err != nil && closeErr == nil {
			closeErr = err
		}
	}
	return closeErr
}

func (e *Executor) queryDestinationTable(ctx context.Context, projectID string, jobID string, location string) (tableRef, error) {
	call := e.bqService.Jobs.Get(projectID, jobID).Context(ctx)
	if location != "" {
		call.Location(location)
	}
	rawJob, err := call.Do()
	if err != nil {
		return tableRef{}, classifyUpstreamError(err)
	}
	if rawJob.Configuration == nil || rawJob.Configuration.Query == nil || rawJob.Configuration.Query.DestinationTable == nil {
		return tableRef{}, fmt.Errorf("bigquery query job destination table is missing")
	}
	table := rawJob.Configuration.Query.DestinationTable
	if table.ProjectId == "" || table.DatasetId == "" || table.TableId == "" {
		return tableRef{}, fmt.Errorf("bigquery query job destination table is incomplete")
	}
	return tableRef{
		projectID: table.ProjectId,
		datasetID: table.DatasetId,
		tableID:   table.TableId,
	}, nil
}

func (e *Executor) readTable(ctx context.Context, table tableRef, sender grpcdatasource.QueryChunkSender) (int64, int64, error) {
	session, err := e.reader.CreateReadSession(ctx, &storagepb.CreateReadSessionRequest{
		Parent: fmt.Sprintf("projects/%s", table.projectID),
		ReadSession: &storagepb.ReadSession{
			Table:      fmt.Sprintf("projects/%s/datasets/%s/tables/%s", table.projectID, table.datasetID, table.tableID),
			DataFormat: storagepb.DataFormat_ARROW,
		},
		MaxStreamCount: 1,
	})
	if err != nil {
		return 0, 0, classifyUpstreamError(err)
	}
	if schema := session.GetArrowSchema(); schema != nil {
		if err := sender.SendArrowSchema(schema.GetSerializedSchema()); err != nil {
			return 0, 0, err
		}
	}

	var rowCount int64
	for _, stream := range session.GetStreams() {
		client, err := e.reader.ReadRows(ctx, &storagepb.ReadRowsRequest{ReadStream: stream.GetName()})
		if err != nil {
			return rowCount, session.GetEstimatedTotalBytesScanned(), classifyUpstreamError(err)
		}
		for {
			resp, err := client.Recv()
			if stderrors.Is(err, context.Canceled) || stderrors.Is(err, context.DeadlineExceeded) {
				return rowCount, session.GetEstimatedTotalBytesScanned(), classifyUpstreamError(err)
			}
			if err != nil {
				if stderrors.Is(err, io.EOF) {
					break
				}
				return rowCount, session.GetEstimatedTotalBytesScanned(), err
			}
			if schema := resp.GetArrowSchema(); schema != nil && session.GetArrowSchema() == nil {
				if err := sender.SendArrowSchema(schema.GetSerializedSchema()); err != nil {
					return rowCount, session.GetEstimatedTotalBytesScanned(), err
				}
			}
			if batch := resp.GetArrowRecordBatch(); batch != nil {
				rowCount += resp.GetRowCount()
				if err := sender.SendArrowRecordBatch(batch.GetSerializedRecordBatch()); err != nil {
					return rowCount, session.GetEstimatedTotalBytesScanned(), err
				}
			}
		}
	}
	return rowCount, session.GetEstimatedTotalBytesScanned(), nil
}

func classifyUpstreamError(err error) error {
	if err == nil || stderrors.Is(err, context.Canceled) || stderrors.Is(err, context.DeadlineExceeded) {
		return err
	}
	if _, ok := grpcdatasource.QueryFailureDetail(err); ok {
		return err
	}

	reason, upstreamMessage := bigQueryErrorDetail(err)
	code, retryable := classifyBigQueryReason(reason)
	if upstreamMessage == "" {
		upstreamMessage = err.Error()
	}
	return grpcdatasource.QueryFailure(
		code,
		err.Error(),
		err,
		grpcdatasource.Retryable(retryable),
		grpcdatasource.Upstream("bigquery", reason, upstreamMessage),
	)
}

func bigQueryErrorDetail(err error) (string, string) {
	var valueErr cloudbigquery.Error
	if stderrors.As(err, &valueErr) {
		return valueErr.Reason, valueErr.Message
	}
	var pointerErr *cloudbigquery.Error
	if stderrors.As(err, &pointerErr) && pointerErr != nil {
		return pointerErr.Reason, pointerErr.Message
	}
	var multiErr cloudbigquery.MultiError
	if stderrors.As(err, &multiErr) {
		for _, nested := range multiErr {
			if reason, message := bigQueryErrorDetail(nested); reason != "" || message != "" {
				return reason, message
			}
		}
	}
	var apiErr *googleapi.Error
	if stderrors.As(err, &apiErr) && apiErr != nil {
		for _, item := range apiErr.Errors {
			if item.Reason != "" || item.Message != "" {
				return item.Reason, item.Message
			}
		}
		return fmt.Sprintf("http_%d", apiErr.Code), apiErr.Message
	}
	if grpcStatus, ok := status.FromError(err); ok && grpcStatus.Code() != codes.Unknown {
		return grpcStatus.Code().String(), grpcStatus.Message()
	}
	return "", err.Error()
}

func classifyBigQueryReason(reason string) (datasourcev1.DataSourceErrorCode, bool) {
	switch reason {
	case "bytesBilledLimitExceeded":
		return datasourcev1.DataSourceErrorCode_DATA_SOURCE_ERROR_CODE_LIMIT_EXCEEDED, false
	case "accessDenied":
		return datasourcev1.DataSourceErrorCode_DATA_SOURCE_ERROR_CODE_PERMISSION_DENIED, false
	case "invalidQuery":
		return datasourcev1.DataSourceErrorCode_DATA_SOURCE_ERROR_CODE_QUERY_INVALID, false
	case "notFound":
		return datasourcev1.DataSourceErrorCode_DATA_SOURCE_ERROR_CODE_TABLE_NOT_FOUND, false
	case "rateLimitExceeded":
		return datasourcev1.DataSourceErrorCode_DATA_SOURCE_ERROR_CODE_RESOURCE_EXHAUSTED, true
	case "quotaExceeded", "resourcesExceeded":
		return datasourcev1.DataSourceErrorCode_DATA_SOURCE_ERROR_CODE_RESOURCE_EXHAUSTED, false
	case codes.Unavailable.String():
		return datasourcev1.DataSourceErrorCode_DATA_SOURCE_ERROR_CODE_UNAVAILABLE, true
	case codes.ResourceExhausted.String():
		return datasourcev1.DataSourceErrorCode_DATA_SOURCE_ERROR_CODE_RESOURCE_EXHAUSTED, true
	case codes.DeadlineExceeded.String():
		return datasourcev1.DataSourceErrorCode_DATA_SOURCE_ERROR_CODE_TIMEOUT, true
	case "backendError", "internalError", "jobBackendError":
		return datasourcev1.DataSourceErrorCode_DATA_SOURCE_ERROR_CODE_EXTERNAL_ERROR, true
	default:
		return datasourcev1.DataSourceErrorCode_DATA_SOURCE_ERROR_CODE_EXTERNAL_ERROR, false
	}
}

func normalizeSourceConfig(cfg SourceConfig, defaultProjectID string) (SourceConfig, error) {
	cfg.SourceID = strings.TrimSpace(cfg.SourceID)
	if cfg.SourceID == "" {
		return SourceConfig{}, fmt.Errorf("source_id is required")
	}
	cfg.ProjectID = strings.TrimSpace(firstNonEmpty(cfg.ProjectID, defaultProjectID))
	if cfg.ProjectID == "" {
		return SourceConfig{}, fmt.Errorf("bigquery project_id is required for source_id %s", cfg.SourceID)
	}
	cfg.DatasetID = strings.TrimSpace(cfg.DatasetID)
	if cfg.DatasetID == "" {
		return SourceConfig{}, fmt.Errorf("bigquery dataset_id is required for source_id %s", cfg.SourceID)
	}
	return cfg, nil
}

func clientOptions(ctx context.Context, cfg Config) ([]option.ClientOption, error) {
	credentialJSON := strings.TrimSpace(cfg.CredentialsJSON)
	if credentialJSON == "" {
		for _, envVar := range cfg.CredentialsEnvVars {
			if value := strings.TrimSpace(os.Getenv(strings.TrimSpace(envVar))); value != "" {
				credentialJSON = value
				break
			}
		}
	}
	if credentialJSON == "" {
		return nil, nil
	}
	creds, err := google.CredentialsFromJSONWithType(ctx, []byte(credentialJSON), google.ServiceAccount, cloudbigquery.Scope)
	if err != nil {
		return nil, err
	}
	return []option.ClientOption{option.WithCredentials(creds)}, nil
}

func firstNonEmpty(values ...string) string {
	for _, value := range values {
		if strings.TrimSpace(value) != "" {
			return value
		}
	}
	return ""
}

var _ grpcdatasource.QueryExecutor = (*Executor)(nil)
