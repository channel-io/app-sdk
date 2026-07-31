package datasource_test

import (
	"context"
	"encoding/json"
	"strings"
	"testing"

	"github.com/channel-io/app-sdk/go/appsdk"
	"github.com/channel-io/app-sdk/go/extension/datasource"
	"github.com/channel-io/app-sdk/go/testkit"
)

func TestAuthorizeQueryValidatesInputAndPreservesRequiredOutputFields(t *testing.T) {
	app := appsdk.New(appsdk.Options{AppID: "app"})
	var received *datasource.AuthorizeQueryInput
	err := app.Use(datasource.Extension().AuthorizeQuery(
		func(_ context.Context, _ appsdk.Context, input *datasource.AuthorizeQueryInput) (*datasource.AuthorizeQueryOutput, error) {
			received = input
			return &datasource.AuthorizeQueryOutput{
				Authorized: false,
				Filters: []*datasource.QueryFilter{{
					Table:  "orders",
					Column: "scope_key",
					Values: []string{},
				}},
			}, nil
		},
	))
	if err != nil {
		t.Fatal(err)
	}

	response := testkit.Call(t, app, datasource.FunctionAuthorizeQuery, datasource.AuthorizeQueryInput{
		LocalCatalogAlias: "bigquery",
		Tables: []*datasource.QueryTableAccess{{
			Name:    "orders",
			Columns: []string{"scope_key"},
		}},
	})
	if response.IsError() {
		t.Fatalf("unexpected authorizeQuery error: %+v", response.Error)
	}

	var output map[string]any
	if err := json.Unmarshal(response.Result, &output); err != nil {
		t.Fatal(err)
	}
	if received.GetLocalCatalogAlias() != "bigquery" || received.GetTables()[0].GetName() != "orders" {
		t.Fatalf("unexpected authorizeQuery input: %+v", received)
	}
	if authorized, exists := output["authorized"]; !exists || authorized != false {
		t.Fatalf("expected explicit authorized=false, got %s", response.Result)
	}
	filters := output["filters"].([]any)
	values := filters[0].(map[string]any)["values"].([]any)
	if len(values) != 0 {
		t.Fatalf("expected explicit empty values array, got %s", response.Result)
	}
}

func TestAuthorizeQueryRejectsInvalidInputBeforeHandler(t *testing.T) {
	app := appsdk.New(appsdk.Options{AppID: "app"})
	called := false
	err := app.Use(datasource.Extension().AuthorizeQuery(
		func(context.Context, appsdk.Context, *datasource.AuthorizeQueryInput) (*datasource.AuthorizeQueryOutput, error) {
			called = true
			return &datasource.AuthorizeQueryOutput{Authorized: true}, nil
		},
	))
	if err != nil {
		t.Fatal(err)
	}

	response := testkit.Call(t, app, datasource.FunctionAuthorizeQuery, map[string]any{
		"localCatalogAlias": "bigquery",
		"tables": []any{
			map[string]any{"name": "orders", "columns": []string{}},
			map[string]any{"name": "orders", "columns": []string{}},
		},
	})
	if !response.IsError() || response.Error.Code != appsdk.CodeBadRequest {
		t.Fatalf("expected invalid input error, got %+v", response)
	}
	if called {
		t.Fatal("authorizeQuery handler was called for invalid input")
	}
}

func TestAuthorizeQueryRejectsRawSQLAndMissingColumns(t *testing.T) {
	tests := []map[string]any{
		{
			"localCatalogAlias": "bigquery",
			"tables":            []any{map[string]any{"name": "orders", "columns": []string{}}},
			"rawSql":            "SELECT * FROM orders",
		},
		{
			"localCatalogAlias": "bigquery",
			"tables":            []any{map[string]any{"name": "orders"}},
		},
	}

	for _, params := range tests {
		app := appsdk.New(appsdk.Options{AppID: "app"})
		called := false
		if err := app.Use(datasource.Extension().AuthorizeQuery(
			func(context.Context, appsdk.Context, *datasource.AuthorizeQueryInput) (*datasource.AuthorizeQueryOutput, error) {
				called = true
				return &datasource.AuthorizeQueryOutput{Authorized: true}, nil
			},
		)); err != nil {
			t.Fatal(err)
		}

		response := testkit.Call(t, app, datasource.FunctionAuthorizeQuery, params)
		if !response.IsError() || response.Error.Code != appsdk.CodeBadRequest {
			t.Fatalf("expected invalid input error, got %+v", response)
		}
		if called {
			t.Fatal("authorizeQuery handler was called for invalid input")
		}
	}
}

func TestAuthorizeQueryRejectsDuplicateAndOversizedOutput(t *testing.T) {
	tests := []struct {
		name   string
		output *datasource.AuthorizeQueryOutput
	}{
		{
			name: "duplicate values",
			output: &datasource.AuthorizeQueryOutput{
				Authorized: true,
				Filters: []*datasource.QueryFilter{{
					Table: "orders", Column: "scope_key", Values: []string{"scope-1", "scope-1"},
				}},
			},
		},
		{
			name: "oversized serialized output",
			output: &datasource.AuthorizeQueryOutput{
				Authorized: true,
				Filters: []*datasource.QueryFilter{{
					Table: "orders", Column: "scope_key", Values: []string{strings.Repeat("x", datasource.MaxQueryAuthorizationOutputBytes)},
				}},
			},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			app := appsdk.New(appsdk.Options{AppID: "app"})
			if err := app.Use(datasource.Extension().AuthorizeQuery(
				func(context.Context, appsdk.Context, *datasource.AuthorizeQueryInput) (*datasource.AuthorizeQueryOutput, error) {
					return tt.output, nil
				},
			)); err != nil {
				t.Fatal(err)
			}

			response := testkit.Call(t, app, datasource.FunctionAuthorizeQuery, map[string]any{
				"localCatalogAlias": "bigquery",
				"tables":            []any{map[string]any{"name": "orders", "columns": []string{}}},
			})
			if !response.IsError() || response.Error.Code != appsdk.CodeInternal {
				if response.Error == nil {
					t.Fatalf("expected invalid output error, got %+v", response)
				}
				t.Fatalf("expected invalid output error, got code=%d type=%q message=%q", response.Error.Code, response.Error.Type, response.Error.Message)
			}
		})
	}
}
