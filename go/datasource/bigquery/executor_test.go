package bigquery

import (
	"bytes"
	"context"
	"encoding/json"
	"log/slog"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	cloudbigquery "cloud.google.com/go/bigquery"
	grpcdatasource "github.com/channel-io/app-sdk/go/datasource/grpc"
	datasourcev1 "github.com/channel-io/app-sdk/go/internal/gen/io/channel/datasource/v1"
	bqapi "google.golang.org/api/bigquery/v2"
	"google.golang.org/api/option"
)

func TestNormalizeSourceConfigDefaultsProject(t *testing.T) {
	cfg, err := normalizeSourceConfig(SourceConfig{
		SourceID:  "bigquery",
		DatasetID: "dataset_1",
	}, "project-1")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if cfg.ProjectID != "project-1" {
		t.Fatalf("project default mismatch: %s", cfg.ProjectID)
	}
}

func TestClassifyUpstreamErrorMapsBytesBilledLimit(t *testing.T) {
	upstream := cloudbigquery.Error{
		Reason:  "bytesBilledLimitExceeded",
		Message: "Query exceeded limit for bytes billed: 2147483648. 13774094336 or higher required.",
	}

	err := classifyUpstreamError(cloudbigquery.MultiError{&upstream})
	detail, ok := grpcdatasource.QueryFailureDetail(err)
	if !ok {
		t.Fatalf("expected structured datasource error, got %T: %v", err, err)
	}
	if detail.GetCode() != datasourcev1.DataSourceErrorCode_DATA_SOURCE_ERROR_CODE_LIMIT_EXCEEDED {
		t.Fatalf("unexpected code: %s", detail.GetCode())
	}
	if detail.GetRetryable() {
		t.Fatal("bytes billed limit must not be retryable")
	}
	if detail.GetUpstream().GetEngine() != "bigquery" || detail.GetUpstream().GetCode() != upstream.Reason || detail.GetUpstream().GetMessage() != upstream.Message {
		t.Fatalf("unexpected upstream detail: %+v", detail.GetUpstream())
	}
}

func TestClassifyUpstreamErrorKeepsUnknownBigQueryFailureExternal(t *testing.T) {
	err := classifyUpstreamError(cloudbigquery.Error{Reason: "newReason", Message: "upstream failed"})
	detail, ok := grpcdatasource.QueryFailureDetail(err)
	if !ok {
		t.Fatalf("expected structured datasource error, got %T: %v", err, err)
	}
	if detail.GetCode() != datasourcev1.DataSourceErrorCode_DATA_SOURCE_ERROR_CODE_EXTERNAL_ERROR {
		t.Fatalf("unexpected code: %s", detail.GetCode())
	}
}

func TestExtractQueryBillingStatisticsUsesCompletedQueryJob(t *testing.T) {
	status := &cloudbigquery.JobStatus{Statistics: &cloudbigquery.JobStatistics{
		TotalBytesProcessed: 11,
		Details: &cloudbigquery.QueryStatistics{
			TotalBytesProcessed: 22,
			TotalBytesBilled:    33,
		},
	}}

	statistics, available := extractQueryBillingStatistics(status)
	if !available {
		t.Fatal("expected query billing statistics")
	}
	if statistics.totalBytesProcessed != 22 || statistics.totalBytesBilled != 33 {
		t.Fatalf("unexpected query billing statistics: %+v", statistics)
	}
}

func TestBillingLogLevelUsesConfiguredThresholds(t *testing.T) {
	tests := []struct {
		name      string
		billed    int64
		wantLevel slog.Level
		wantAlert string
	}{
		{name: "normal", billed: 9, wantLevel: slog.LevelInfo, wantAlert: "none"},
		{name: "warning", billed: 10, wantLevel: slog.LevelWarn, wantAlert: "warning"},
		{name: "critical", billed: 30, wantLevel: slog.LevelError, wantAlert: "critical"},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			level, alert := billingLogLevel(tt.billed, 10, 30)
			if level != tt.wantLevel || alert != tt.wantAlert {
				t.Fatalf("unexpected billing level: level=%s alert=%s", level, alert)
			}
		})
	}
}

func TestLogQueryBillingIncludesAttributionWithoutSQL(t *testing.T) {
	var output bytes.Buffer
	executor := &Executor{
		logger:                       slog.New(slog.NewJSONHandler(&output, nil)),
		billedBytesWarningThreshold:  10,
		billedBytesCriticalThreshold: 30,
	}
	ctx := grpcdatasource.ContextWithAccessTokenIdentity(context.Background(), grpcdatasource.AccessTokenIdentity{
		AppID:     "app-1",
		ChannelID: "channel-1",
	})
	status := &cloudbigquery.JobStatus{Statistics: &cloudbigquery.JobStatistics{
		Details: &cloudbigquery.QueryStatistics{
			TotalBytesProcessed: 12,
			TotalBytesBilled:    10,
		},
	}}

	executor.logQueryBilling(ctx, "job-1", "project-1", "asia-northeast3", grpcdatasource.QueryRequest{
		SourceID:  "bigquery",
		Query:     "SELECT sensitive_column FROM orders",
		ByteLimit: 50,
	}, status)

	if strings.Contains(output.String(), "sensitive_column") {
		t.Fatalf("billing log must not include SQL: %s", output.String())
	}
	var record map[string]any
	if err := json.Unmarshal(output.Bytes(), &record); err != nil {
		t.Fatalf("decode billing log: %v", err)
	}
	if record["level"] != "WARN" || record["billing_alert_level"] != "warning" {
		t.Fatalf("unexpected alert fields: %+v", record)
	}
	if record["total_bytes_processed"] != float64(12) || record["total_bytes_billed"] != float64(10) || record["max_bytes_billed"] != float64(50) {
		t.Fatalf("unexpected billing fields: %+v", record)
	}
	if record["job_id"] != "job-1" || record["source_id"] != "bigquery" || record["app_id"] != "app-1" || record["channel_id"] != "channel-1" {
		t.Fatalf("unexpected attribution fields: %+v", record)
	}
	if record["query_hash"] != queryHash("SELECT sensitive_column FROM orders") {
		t.Fatalf("unexpected query hash: %+v", record["query_hash"])
	}
}

func TestQueryDestinationTableReadsJobMetadata(t *testing.T) {
	var requestPath string
	var requestLocation string
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		requestPath = r.URL.Path
		requestLocation = r.URL.Query().Get("location")
		_, _ = w.Write([]byte(`{
			"configuration": {
				"query": {
					"destinationTable": {
						"projectId": "project-1",
						"datasetId": "_anon",
						"tableId": "anon_table"
					}
				}
			}
		}`))
	}))
	defer server.Close()

	service, err := bqapi.NewService(
		context.Background(),
		option.WithEndpoint(server.URL+"/"),
		option.WithoutAuthentication(),
	)
	if err != nil {
		t.Fatalf("new service: %v", err)
	}
	executor := &Executor{bqService: service}

	table, err := executor.queryDestinationTable(context.Background(), "project-1", "job-1", "asia-northeast3")
	if err != nil {
		t.Fatalf("query destination table: %v", err)
	}
	if requestPath != "/projects/project-1/jobs/job-1" {
		t.Fatalf("request path mismatch: %s", requestPath)
	}
	if requestLocation != "asia-northeast3" {
		t.Fatalf("request location mismatch: %s", requestLocation)
	}
	if table != (tableRef{projectID: "project-1", datasetID: "_anon", tableID: "anon_table"}) {
		t.Fatalf("table mismatch: %#v", table)
	}
}
