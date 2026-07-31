package datasource_test

import (
	"context"
	"testing"

	"github.com/channel-io/app-sdk/go/appsdk"
	"github.com/channel-io/app-sdk/go/extension/datasource"
	"github.com/channel-io/app-sdk/go/testkit"
	"google.golang.org/protobuf/encoding/protojson"
)

func TestExtensionRegistersDatasourceMetadataFunctions(t *testing.T) {
	app := appsdk.New(appsdk.Options{AppID: "app"})
	err := app.Use(datasource.Extension().
		ListCatalogs(func(context.Context, appsdk.Context, *datasource.ListCatalogsInput) (*datasource.ListCatalogsOutput, error) {
			return &datasource.ListCatalogsOutput{Catalogs: []*datasource.Catalog{{Alias: "bigquery", Dialect: datasource.DialectBigQuery}}}, nil
		}).
		ListTables(func(context.Context, appsdk.Context, *datasource.ListTablesInput) (*datasource.ListTablesOutput, error) {
			return &datasource.ListTablesOutput{Tables: []*datasource.TableListing{{Table: &datasource.Table{Name: "orders", LocalCatalogAlias: "bigquery"}}}}, nil
		}).
		DescribeTable(func(context.Context, appsdk.Context, *datasource.DescribeTableInput) (*datasource.DescribeTableOutput, error) {
			return &datasource.DescribeTableOutput{
				Definition: &datasource.TableDefinition{
					Table:   &datasource.Table{Name: "orders", LocalCatalogAlias: "bigquery"},
					Columns: []*datasource.Column{{Name: "id", Type: "STRING", Nullable: false}},
				},
			}, nil
		}))
	if err != nil {
		t.Fatal(err)
	}

	functions := testkit.Functions(t, app)
	names := make(map[string]bool, len(functions))
	for _, fn := range functions {
		names[fn.Name] = true
	}
	for _, name := range []string{
		datasource.FunctionListCatalogs,
		datasource.FunctionListTables,
		datasource.FunctionDescribeTable,
	} {
		if !names[name] {
			t.Fatalf("expected function %s to be registered", name)
		}
	}
	if names[datasource.FunctionAuthorizeQuery] {
		t.Fatalf("did not expect optional function %s to be registered", datasource.FunctionAuthorizeQuery)
	}
}

func TestFromProviderRegistersDatasourceMetadataFunctions(t *testing.T) {
	app := appsdk.New(appsdk.Options{AppID: "app"})
	if err := app.Use(datasource.FromProvider(fakeProvider{})); err != nil {
		t.Fatal(err)
	}

	functions := testkit.Functions(t, app)
	names := make(map[string]bool, len(functions))
	for _, fn := range functions {
		names[fn.Name] = true
	}
	for _, name := range []string{
		datasource.FunctionListCatalogs,
		datasource.FunctionListTables,
		datasource.FunctionDescribeTable,
	} {
		if !names[name] {
			t.Fatalf("expected function %s to be registered", name)
		}
	}
	if names[datasource.FunctionAuthorizeQuery] {
		t.Fatalf("did not expect optional function %s to be registered", datasource.FunctionAuthorizeQuery)
	}
}

func TestFromProviderRegistersOptionalQueryAuthorizer(t *testing.T) {
	app := appsdk.New(appsdk.Options{AppID: "app"})
	if err := app.Use(datasource.FromProvider(fakeAuthorizingProvider{})); err != nil {
		t.Fatal(err)
	}

	functions := testkit.Functions(t, app)
	for _, fn := range functions {
		if fn.Name == datasource.FunctionAuthorizeQuery {
			return
		}
	}
	t.Fatalf("expected optional function %s to be registered", datasource.FunctionAuthorizeQuery)
}

func TestStaticMetadataListsAndDescribesTables(t *testing.T) {
	app := appsdk.New(appsdk.Options{AppID: "app"})
	tt := datasource.TableTypeTable
	err := app.Use(datasource.StaticMetadata(datasource.Metadata{
		Catalogs: []*datasource.Catalog{{Alias: "bigquery", Dialect: datasource.DialectBigQuery}},
		Tables: []*datasource.TableListing{
			{Table: &datasource.Table{Name: "orders", LocalCatalogAlias: "bigquery", TableType: &tt, ManagerAccess: datasource.ManagerAccessOwner}},
			{Table: &datasource.Table{Name: "products", LocalCatalogAlias: "bigquery", TableType: &tt}},
		},
		Definitions: []*datasource.TableDefinition{
			{
				Table:      &datasource.Table{Name: "orders", LocalCatalogAlias: "bigquery", TableType: &tt},
				Columns:    []*datasource.Column{{Name: "order_id", Type: "STRING", Nullable: false}},
				PrimaryKey: []string{"order_id"},
			},
		},
		Samples: map[string][]map[string]any{
			datasource.SampleKey("bigquery", "orders"): {{"order_id": "o-1"}},
		},
	}))
	if err != nil {
		t.Fatal(err)
	}

	limit := int32(1)
	listRes := testkit.Call(t, app, datasource.FunctionListTables, datasource.ListTablesInput{
		LocalCatalogAlias: "bigquery",
		Limit:             &limit,
	})
	if listRes.IsError() {
		t.Fatalf("unexpected list error: %+v", listRes.Error)
	}
	var listOut datasource.ListTablesOutput
	if err := protojson.Unmarshal(listRes.Result, &listOut); err != nil {
		t.Fatal(err)
	}
	if len(listOut.Tables) != 1 || listOut.Tables[0].GetTable().GetName() != "orders" || listOut.GetNextPageToken() == "" {
		t.Fatalf("unexpected list output: tables=%d nextPageToken=%q", len(listOut.GetTables()), listOut.GetNextPageToken())
	}
	if listOut.Tables[0].GetTable().GetManagerAccess() != datasource.ManagerAccessOwner {
		t.Fatalf("unexpected manager access: %q", listOut.Tables[0].GetTable().GetManagerAccess())
	}

	includeSample := true
	describeRes := testkit.Call(t, app, datasource.FunctionDescribeTable, datasource.DescribeTableInput{
		LocalCatalogAlias: "bigquery",
		TableName:         "orders",
		IncludeSample:     &includeSample,
	})
	if describeRes.IsError() {
		t.Fatalf("unexpected describe error: %+v", describeRes.Error)
	}
	var describeOut datasource.DescribeTableOutput
	if err := protojson.Unmarshal(describeRes.Result, &describeOut); err != nil {
		t.Fatal(err)
	}
	if describeOut.GetDefinition().GetPrimaryKey()[0] != "order_id" || describeOut.GetSample()[0].AsMap()["order_id"] != "o-1" {
		t.Fatalf(
			"unexpected describe output: primaryKey=%v sample=%v",
			describeOut.GetDefinition().GetPrimaryKey(),
			describeOut.GetSample(),
		)
	}
}

func TestValidateSampleRejectsUnknownColumns(t *testing.T) {
	definition := &datasource.TableDefinition{
		Table:   &datasource.Table{Name: "orders", LocalCatalogAlias: "bigquery"},
		Columns: []*datasource.Column{{Name: "order_id", Type: "STRING", Nullable: false}},
	}

	if err := datasource.ValidateSample(definition, []map[string]any{{"unknown": "value"}}); err == nil {
		t.Fatal("expected unknown sample column to fail")
	}
}

func TestProtoMetadataTypesAreExported(t *testing.T) {
	catalog := &datasource.ProtoCatalog{Alias: "bigquery", Dialect: string(datasource.DialectBigQuery)}
	output := datasource.ProtoListCatalogsOutput{Catalogs: []*datasource.ProtoCatalog{catalog}}

	if output.GetCatalogs()[0].GetAlias() != "bigquery" {
		t.Fatalf("unexpected proto catalog output: %+v", output.GetCatalogs())
	}
}

type fakeAuthorizingProvider struct {
	fakeProvider
}

func (fakeAuthorizingProvider) AuthorizeQuery(context.Context, appsdk.Context, *datasource.AuthorizeQueryInput) (*datasource.AuthorizeQueryOutput, error) {
	return &datasource.AuthorizeQueryOutput{Authorized: true}, nil
}

type fakeProvider struct{}

func (fakeProvider) ListCatalogs(context.Context, appsdk.Context, *datasource.ListCatalogsInput) (*datasource.ListCatalogsOutput, error) {
	return &datasource.ListCatalogsOutput{Catalogs: []*datasource.Catalog{{Alias: "bigquery", Dialect: datasource.DialectBigQuery}}}, nil
}

func (fakeProvider) ListTables(context.Context, appsdk.Context, *datasource.ListTablesInput) (*datasource.ListTablesOutput, error) {
	return &datasource.ListTablesOutput{Tables: []*datasource.TableListing{{Table: &datasource.Table{Name: "orders", LocalCatalogAlias: "bigquery"}}}}, nil
}

func (fakeProvider) DescribeTable(context.Context, appsdk.Context, *datasource.DescribeTableInput) (*datasource.DescribeTableOutput, error) {
	return &datasource.DescribeTableOutput{
		Definition: &datasource.TableDefinition{
			Table:   &datasource.Table{Name: "orders", LocalCatalogAlias: "bigquery"},
			Columns: []*datasource.Column{{Name: "id", Type: "STRING", Nullable: false}},
		},
	}, nil
}
