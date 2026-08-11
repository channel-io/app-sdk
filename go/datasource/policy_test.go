package datasource_test

import (
	"testing"

	"github.com/channel-io/app-sdk/go/datasource"
)

func TestValidateReadOnlyQueryRejectsWrites(t *testing.T) {
	err := datasource.ValidateReadOnlyQuery("UPDATE orders SET id = 'x'", nil, nil)
	if err == nil {
		t.Fatal("expected writable query to fail")
	}
}

func TestValidateReadOnlyQueryAcceptsMultilineSelectAndWith(t *testing.T) {
	for _, query := range []string{
		"SELECT\n  COUNT(*) AS order_count\nFROM orders",
		"WITH\n  recent_orders AS (SELECT id FROM orders)\nSELECT COUNT(*) FROM recent_orders",
	} {
		err := datasource.ValidateReadOnlyQuery(query, []string{"orders"}, []datasource.TableConfig{{Name: "orders"}})
		if err != nil {
			t.Fatalf("expected multiline read-only query to pass: %v", err)
		}
	}
}

func TestValidateReadOnlyQueryAcceptsCommentsAndLiteralContent(t *testing.T) {
	queries := map[string]string{
		"dash comment":    "-- generated query; do not update\nSELECT * FROM orders",
		"hash comment":    "# generated query; do not delete\nSELECT * FROM orders",
		"block comment":   "/* generated query; do not insert */\nSELECT * FROM orders",
		"inline comments": "SELECT * /* delete; update */ FROM orders -- drop;\n",
		"quoted content":  "SELECT 'delete; update' AS note FROM orders",
		"escaped quote":   "SELECT 'don''t delete; update' AS note FROM orders",
		"dollar quote":    "SELECT $$delete; update$$ AS note FROM orders",
		"quoted table":    "SELECT * FROM `project.dataset.orders`",
	}

	for name, query := range queries {
		t.Run(name, func(t *testing.T) {
			err := datasource.ValidateReadOnlyQuery(query, nil, []datasource.TableConfig{{Name: "orders"}})
			if err != nil {
				t.Fatalf("expected commented read-only query to pass: %v", err)
			}
		})
	}
}

func TestValidateReadOnlyQueryRejectsExecutableStatementsAfterCommentsAndLiterals(t *testing.T) {
	queries := map[string]string{
		"commented write":           "-- generated query\nUPDATE orders SET id = 'x'",
		"multiple statements":       "SELECT * FROM orders; DELETE FROM orders",
		"write in CTE":              "WITH changed AS (UPDATE orders SET id = 'x') SELECT * FROM changed",
		"unterminated comment":      "SELECT * FROM orders /* unfinished",
		"comment after terminator":  "SELECT * FROM orders; -- wrapper would be invalid",
		"postgres hash operator":    "SELECT payload #>> '{path}' FROM orders; DELETE FROM orders",
		"nested block comment":      "SELECT 1 /* /* */ ; DELETE FROM orders */",
		"ambiguous backslash quote": "SELECT 'a\\'' AS note FROM orders",
	}

	for name, query := range queries {
		t.Run(name, func(t *testing.T) {
			if err := datasource.ValidateReadOnlyQuery(query, nil, nil); err == nil {
				t.Fatal("expected unsafe query to fail")
			}
		})
	}
}

func TestValidateReadOnlyQueryAllowsTablelessCommentsAndLiterals(t *testing.T) {
	for _, query := range []string{
		"SELECT 'orders' AS note",
		"SELECT 1 /* FROM orders */",
	} {
		err := datasource.ValidateReadOnlyQuery(query, nil, []datasource.TableConfig{{Name: "orders"}})
		if err != nil {
			t.Fatalf("expected tableless query to pass: %v", err)
		}
	}
}

func TestValidateReadOnlyQueryAcceptsTablelessQueries(t *testing.T) {
	tables := []datasource.TableConfig{{Name: "orders"}}
	for _, query := range []string{
		"SELECT 1",
		"-- health check\nSELECT CURRENT_TIMESTAMP()",
		"SELECT 'from orders' AS note /* JOIN customers */",
		`SELECT "join customers" AS note`,
	} {
		if err := datasource.ValidateReadOnlyQuery(query, nil, tables); err != nil {
			t.Errorf("expected tableless query %q to pass: %v", query, err)
		}
	}
}

func TestValidateReadOnlyQueryDefersTableAuthorizationAndDialectSyntax(t *testing.T) {
	tables := []datasource.TableConfig{{Name: "orders"}}
	for _, query := range []string{
		"SELECT * FROM customers",
		"SELECT * FROM UNNEST([1, 2, 3])",
		"SELECT * FROM (SELECT 1)",
	} {
		if err := datasource.ValidateReadOnlyQuery(query, nil, tables); err != nil {
			t.Errorf("expected App Store/provider validation for %q, got %v", query, err)
		}
	}
}

func TestQueryWithRowLimitWrapsQuery(t *testing.T) {
	got := datasource.QueryWithRowLimit("SELECT id FROM orders;", 10)
	want := "SELECT * FROM (SELECT id FROM orders) AS datasource_query LIMIT 10"
	if got != want {
		t.Fatalf("unexpected query:\nwant: %s\n got: %s", want, got)
	}
}
