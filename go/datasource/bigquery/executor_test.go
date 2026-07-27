package bigquery

import (
	"context"
	"net/http"
	"net/http/httptest"
	"testing"

	cloudbigquery "cloud.google.com/go/bigquery"
	grpcdatasource "github.com/channel-io/cht-app-sdk/go/datasource/grpc"
	datasourcev1 "github.com/channel-io/cht-app-sdk/go/internal/gen/io/channel/datasource/v1"
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
