package sqlrunner

import (
	"context"
	"testing"

	"github.com/DATA-DOG/go-sqlmock"
	"github.com/apache/arrow-go/v18/arrow"

	"github.com/channel-io/app-sdk/go/datasource"
	grpcdatasource "github.com/channel-io/app-sdk/go/datasource/grpc"
)

func TestExecutorStreamsRowsInBatches(t *testing.T) {
	db, mock, err := sqlmock.New()
	if err != nil {
		t.Fatalf("new sqlmock: %v", err)
	}
	defer db.Close()

	mock.ExpectQuery(`SELECT \* FROM \(SELECT id, active FROM orders\) AS datasource_query LIMIT 2`).
		WillReturnRows(sqlmock.NewRows([]string{"id", "active"}).
			AddRow("order-1", true).
			AddRow("order-2", false))

	executor, err := NewExecutor(context.Background(), Config{
		Sources: []SourceConfig{
			{
				SourceID:  "postgresql",
				DB:        db,
				BatchSize: 1,
				Tables:    []datasource.TableConfig{{Name: "orders"}},
			},
		},
	})
	if err != nil {
		t.Fatalf("new executor: %v", err)
	}

	sender := &captureSender{}
	err = executor.ExecuteQuery(context.Background(), grpcdatasource.QueryRequest{
		SourceID: "postgresql",
		Query:    "SELECT id, active FROM orders",
		RowLimit: 2,
	}, sender)
	if err != nil {
		t.Fatalf("execute query: %v", err)
	}
	if len(sender.schemas) != 1 {
		t.Fatalf("expected one schema chunk, got %d", len(sender.schemas))
	}
	if len(sender.batches) != 2 {
		t.Fatalf("expected two record batch chunks, got %d", len(sender.batches))
	}
	if sender.result.RowCount != 2 {
		t.Fatalf("row count mismatch: %d", sender.result.RowCount)
	}
	if err := mock.ExpectationsWereMet(); err != nil {
		t.Fatalf("sql expectations: %v", err)
	}
}

func TestExecutorDefersTableAuthorizationToAppStore(t *testing.T) {
	db, mock, err := sqlmock.New()
	if err != nil {
		t.Fatalf("new sqlmock: %v", err)
	}
	defer db.Close()

	executor, err := NewExecutor(context.Background(), Config{
		Sources: []SourceConfig{{SourceID: "postgresql", DB: db, Tables: []datasource.TableConfig{{Name: "orders"}}}},
	})
	if err != nil {
		t.Fatalf("new executor: %v", err)
	}
	mock.ExpectQuery(`SELECT id FROM customers`).
		WillReturnRows(sqlmock.NewRows([]string{"id"}))
	err = executor.ExecuteQuery(context.Background(), grpcdatasource.QueryRequest{
		SourceID: "postgresql",
		Query:    "SELECT id FROM customers",
	}, &captureSender{})
	if err != nil {
		t.Fatalf("expected App Store-authorized table query to reach the provider: %v", err)
	}
	if err := mock.ExpectationsWereMet(); err != nil {
		t.Fatalf("sql expectations: %v", err)
	}
}

func TestExecutorSendsSchemaForEmptyResult(t *testing.T) {
	db, mock, err := sqlmock.New()
	if err != nil {
		t.Fatalf("new sqlmock: %v", err)
	}
	defer db.Close()

	mock.ExpectQuery(`SELECT \* FROM \(SELECT id FROM orders\) AS datasource_query LIMIT 10`).
		WillReturnRows(sqlmock.NewRows([]string{"id"}))

	executor, err := NewExecutor(context.Background(), Config{
		Sources: []SourceConfig{{SourceID: "postgresql", DB: db, Tables: []datasource.TableConfig{{Name: "orders"}}}},
	})
	if err != nil {
		t.Fatalf("new executor: %v", err)
	}

	sender := &captureSender{}
	err = executor.ExecuteQuery(context.Background(), grpcdatasource.QueryRequest{
		SourceID: "postgresql",
		Query:    "SELECT id FROM orders",
		RowLimit: 10,
	}, sender)
	if err != nil {
		t.Fatalf("execute query: %v", err)
	}
	if len(sender.schemas) != 1 {
		t.Fatalf("expected one schema chunk, got %d", len(sender.schemas))
	}
	if len(sender.batches) != 0 {
		t.Fatalf("expected no record batch chunks, got %d", len(sender.batches))
	}
	if sender.result.RowCount != 0 {
		t.Fatalf("row count mismatch: %d", sender.result.RowCount)
	}
}

func TestStreamRowsMapsDecimalHugeintAndInt256ColumnTypes(t *testing.T) {
	db, mock, err := sqlmock.New()
	if err != nil {
		t.Fatalf("new sqlmock: %v", err)
	}
	defer db.Close()

	mock.ExpectQuery(`SELECT decimals`).
		WillReturnRows(sqlmock.NewRowsWithColumnDefinition(
			mock.NewColumn("amount").OfType("DECIMAL", "").Nullable(true).WithPrecisionAndScale(20, 6),
			mock.NewColumn("wide_amount").OfType("DECIMAL", "").Nullable(true).WithPrecisionAndScale(40, 6),
			mock.NewColumn("sum_amount").OfType("HUGEINT", "").Nullable(true),
			mock.NewColumn("big_counter").OfType("INT256", "").Nullable(true),
		).AddRow(
			"123.456789",
			"1234567890123456789012345678901234.123456",
			"170141183460469231731687303715884105727",
			"12345678901234567890123456789012345678901234567890",
		))

	rows, err := db.Query("SELECT decimals")
	if err != nil {
		t.Fatalf("query: %v", err)
	}
	defer rows.Close()

	columnTypes, err := rows.ColumnTypes()
	if err != nil {
		t.Fatalf("column types: %v", err)
	}
	schema := schemaFromColumnTypes(columnTypes)

	amountType := schema.Field(0).Type.(*arrow.Decimal128Type)
	if amountType.Precision != 20 || amountType.Scale != 6 {
		t.Fatalf("amount type mismatch: %v", amountType)
	}
	wideAmountType := schema.Field(1).Type.(*arrow.Decimal256Type)
	if wideAmountType.Precision != 40 || wideAmountType.Scale != 6 {
		t.Fatalf("wide amount type mismatch: %v", wideAmountType)
	}
	sumAmountType := schema.Field(2).Type.(*arrow.Decimal256Type)
	if sumAmountType.Precision != 39 || sumAmountType.Scale != 0 {
		t.Fatalf("sum amount type mismatch: %v", sumAmountType)
	}
	bigCounterType := schema.Field(3).Type.(*arrow.Decimal256Type)
	if bigCounterType.Precision != 76 || bigCounterType.Scale != 0 {
		t.Fatalf("big counter type mismatch: %v", bigCounterType)
	}

	sender := &captureSender{}
	rowCount, err := StreamRows(context.Background(), rows, sender, StreamRowsOptions{BatchSize: 1})
	if err != nil {
		t.Fatalf("stream rows: %v", err)
	}
	if rowCount != 1 {
		t.Fatalf("row count mismatch: %d", rowCount)
	}
	if len(sender.schemas) != 1 {
		t.Fatalf("expected one schema chunk, got %d", len(sender.schemas))
	}
	if len(sender.batches) != 1 {
		t.Fatalf("expected one record batch chunk, got %d", len(sender.batches))
	}
}

type captureSender struct {
	schemas [][]byte
	batches [][]byte
	result  grpcdatasource.ExecutionResult
}

func (s *captureSender) SendArrowSchema(serializedSchema []byte) error {
	s.schemas = append(s.schemas, append([]byte(nil), serializedSchema...))
	return nil
}

func (s *captureSender) SendArrowRecordBatch(serializedRecordBatch []byte) error {
	s.batches = append(s.batches, append([]byte(nil), serializedRecordBatch...))
	return nil
}

func (s *captureSender) SendExecutionResult(result grpcdatasource.ExecutionResult) error {
	s.result = result
	return nil
}
