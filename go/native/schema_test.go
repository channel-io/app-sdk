package native_test

import (
	"testing"

	"github.com/channel-io/app-sdk/go/native"
)

func TestAppDataTableFunctionSchemas(t *testing.T) {
	schemas := native.AppDataTableFunctionSchemas()
	names := make([]string, 0, len(schemas))
	for _, schema := range schemas {
		names = append(names, schema.Name)
		if schema.InputSchema["type"] != "object" {
			t.Fatalf("expected object input schema for %s, got %#v", schema.Name, schema.InputSchema)
		}
		if schema.OutputSchema["type"] != "object" {
			t.Fatalf("expected object output schema for %s, got %#v", schema.Name, schema.OutputSchema)
		}
	}

	want := []string{
		native.FunctionCreateAppDataTable,
		native.FunctionCreateAppDataTableSchema,
		native.FunctionGetAppDataTableSchema,
		native.FunctionUpsertAppDataTableRows,
	}
	if len(names) != len(want) {
		t.Fatalf("expected %d schemas, got %d: %v", len(want), len(names), names)
	}
	for i := range want {
		if names[i] != want[i] {
			t.Fatalf("unexpected schema order: got %v want %v", names, want)
		}
	}
}

func TestAppDataTableFunctionSchemaReturnsClone(t *testing.T) {
	schema, ok := native.AppDataTableFunctionSchema(native.FunctionUpsertAppDataTableRows)
	if !ok {
		t.Fatal("expected upsert schema")
	}
	schema.InputSchema["type"] = "mutated"

	again, ok := native.AppDataTableFunctionSchema(native.FunctionUpsertAppDataTableRows)
	if !ok {
		t.Fatal("expected upsert schema")
	}
	if again.InputSchema["type"] != "object" {
		t.Fatalf("schema was mutated: %#v", again.InputSchema)
	}

	properties := again.InputSchema["properties"].(map[string]any)
	rows := properties["rows"].(map[string]any)
	if rows["maxItems"] != 100 {
		t.Fatalf("expected row batch maxItems=100, got %#v", rows["maxItems"])
	}
}

func TestAppNotebookFunctionSchemas(t *testing.T) {
	schemas := native.AppNotebookFunctionSchemas()
	names := make([]string, 0, len(schemas))
	for _, schema := range schemas {
		names = append(names, schema.Name)
		if schema.InputSchema["type"] != "object" {
			t.Fatalf("expected object input schema for %s, got %#v", schema.Name, schema.InputSchema)
		}
		if schema.OutputSchema["type"] != "object" {
			t.Fatalf("expected object output schema for %s, got %#v", schema.Name, schema.OutputSchema)
		}
	}

	want := []string{
		native.FunctionGetAppNotebookVersions,
	}
	if len(names) != len(want) {
		t.Fatalf("expected %d schemas, got %d: %v", len(want), len(names), names)
	}
	for i := range want {
		if names[i] != want[i] {
			t.Fatalf("unexpected schema order: got %v want %v", names, want)
		}
	}
}

func TestAppNotebookFunctionSchemaReturnsClone(t *testing.T) {
	schema, ok := native.AppNotebookFunctionSchema(native.FunctionGetAppNotebookVersions)
	if !ok {
		t.Fatal("expected get app notebook versions schema")
	}
	schema.InputSchema["type"] = "mutated"

	again, ok := native.AppNotebookFunctionSchema(native.FunctionGetAppNotebookVersions)
	if !ok {
		t.Fatal("expected get app notebook versions schema")
	}
	if again.InputSchema["type"] != "object" {
		t.Fatalf("schema was mutated: %#v", again.InputSchema)
	}
}
