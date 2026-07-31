package datasource

import (
	"context"
	"encoding/json"
	"fmt"
	"strconv"
	"strings"

	"github.com/channel-io/app-sdk/go/appsdk"
	extensionkit "github.com/channel-io/app-sdk/go/extension"
	"github.com/channel-io/app-sdk/go/extension/schemaregistry"
	"google.golang.org/protobuf/types/known/structpb"
)

const (
	ExtensionName = "datasource"
	SystemVersion = "v1"

	FunctionListCatalogs   = "extension.datasource.catalog.listCatalogs"
	FunctionListTables     = "extension.datasource.catalog.listTables"
	FunctionDescribeTable  = "extension.datasource.catalog.describeTable"
	FunctionAuthorizeQuery = "extension.datasource.query.authorizeQuery"

	MaxSampleRows  = 10
	MaxSampleBytes = 64 * 1024
)

type ExtensionBuilder struct {
	base *extensionkit.Builder
}

type Provider interface {
	ListCatalogs(context.Context, appsdk.Context, *ListCatalogsInput) (*ListCatalogsOutput, error)
	ListTables(context.Context, appsdk.Context, *ListTablesInput) (*ListTablesOutput, error)
	DescribeTable(context.Context, appsdk.Context, *DescribeTableInput) (*DescribeTableOutput, error)
}

type QueryAuthorizer interface {
	AuthorizeQuery(context.Context, appsdk.Context, *AuthorizeQueryInput) (*AuthorizeQueryOutput, error)
}

func Extension() *ExtensionBuilder {
	return &ExtensionBuilder{base: extensionkit.New(ExtensionName, extensionkit.SystemVersion(SystemVersion))}
}

func FromProvider(provider Provider) *ExtensionBuilder {
	builder := Extension()
	if provider == nil {
		return builder
	}
	builder = builder.
		ListCatalogs(provider.ListCatalogs).
		ListTables(provider.ListTables).
		DescribeTable(provider.DescribeTable)
	if authorizer, ok := provider.(QueryAuthorizer); ok {
		builder.AuthorizeQuery(authorizer.AuthorizeQuery)
	}
	return builder
}

func (b *ExtensionBuilder) ListCatalogs(handler appsdk.TypedHandlerFunc[ListCatalogsInput, ListCatalogsOutput]) *ExtensionBuilder {
	b.base.Func(FunctionListCatalogs, schemaregistry.Append(FunctionListCatalogs, appsdk.HandleProto(handler))...)
	return b
}

func (b *ExtensionBuilder) ListTables(handler appsdk.TypedHandlerFunc[ListTablesInput, ListTablesOutput]) *ExtensionBuilder {
	b.base.Func(FunctionListTables, schemaregistry.Append(FunctionListTables, appsdk.HandleProto(handler))...)
	return b
}

func (b *ExtensionBuilder) DescribeTable(handler appsdk.TypedHandlerFunc[DescribeTableInput, DescribeTableOutput]) *ExtensionBuilder {
	b.base.Func(FunctionDescribeTable, schemaregistry.Append(FunctionDescribeTable, appsdk.HandleProto(handler))...)
	return b
}

func (b *ExtensionBuilder) Function(name string, opts ...appsdk.FunctionOption) *ExtensionBuilder {
	b.base.Func(name, opts...)
	return b
}

func (b *ExtensionBuilder) ExtensionFunction(name string, opts ...appsdk.FunctionOption) *ExtensionBuilder {
	b.base.ExtensionFunc(name, opts...)
	return b
}

func (b *ExtensionBuilder) Register(app *appsdk.App) error {
	return b.base.Register(app)
}

type Metadata struct {
	Catalogs    []*Catalog
	Tables      []*TableListing
	Definitions []*TableDefinition
	Samples     map[string][]map[string]any
}

func StaticMetadata(metadata Metadata) *ExtensionBuilder {
	index := newMetadataIndex(metadata)
	return Extension().
		ListCatalogs(index.ListCatalogs).
		ListTables(index.ListTables).
		DescribeTable(index.DescribeTable)
}

func SampleKey(localCatalogAlias, tableName string) string {
	return tableKey(localCatalogAlias, tableName)
}

type metadataIndex struct {
	catalogs    []*Catalog
	tables      []*TableListing
	definitions map[string]*TableDefinition
	samples     map[string][]map[string]any
}

func newMetadataIndex(metadata Metadata) *metadataIndex {
	definitions := make(map[string]*TableDefinition, len(metadata.Definitions))
	for _, definition := range metadata.Definitions {
		table := definition.GetTable()
		definitions[tableKey(table.GetLocalCatalogAlias(), table.GetName())] = definition
	}
	return &metadataIndex{
		catalogs:    append([]*Catalog(nil), metadata.Catalogs...),
		tables:      append([]*TableListing(nil), metadata.Tables...),
		definitions: definitions,
		samples:     metadata.Samples,
	}
}

func (m *metadataIndex) ListCatalogs(context.Context, appsdk.Context, *ListCatalogsInput) (*ListCatalogsOutput, error) {
	return &ListCatalogsOutput{Catalogs: append([]*Catalog(nil), m.catalogs...)}, nil
}

func (m *metadataIndex) ListTables(_ context.Context, _ appsdk.Context, input *ListTablesInput) (*ListTablesOutput, error) {
	offset, err := decodePageToken(input.GetPageToken())
	if err != nil {
		return nil, err
	}
	limit := int(input.GetLimit())
	if limit <= 0 {
		limit = len(m.tables)
	}

	filtered := make([]*TableListing, 0, len(m.tables))
	for _, table := range m.tables {
		if input.GetLocalCatalogAlias() != "" && table.GetTable().GetLocalCatalogAlias() != input.GetLocalCatalogAlias() {
			continue
		}
		filtered = append(filtered, table)
	}
	if offset > len(filtered) {
		offset = len(filtered)
	}
	end := offset + limit
	if end > len(filtered) {
		end = len(filtered)
	}

	output := &ListTablesOutput{Tables: append([]*TableListing(nil), filtered[offset:end]...)}
	if end < len(filtered) {
		output.NextPageToken = strconv.Itoa(end)
	}
	return output, nil
}

func (m *metadataIndex) DescribeTable(_ context.Context, _ appsdk.Context, input *DescribeTableInput) (*DescribeTableOutput, error) {
	if strings.TrimSpace(input.GetTableName()) == "" {
		return nil, appsdk.NewError(appsdk.CodeBadRequest, "invalidParams", "tableName is required")
	}
	key := tableKey(input.GetLocalCatalogAlias(), input.GetTableName())
	definition, ok := m.definitions[key]
	if !ok {
		return nil, appsdk.NewError(appsdk.CodeMethodNotFound, "notFound", "datasource table definition not found")
	}
	output := &DescribeTableOutput{Definition: definition}
	if input.GetIncludeSample() && len(m.samples[key]) > 0 {
		if err := ValidateSample(definition, m.samples[key]); err != nil {
			return nil, err
		}
		sample := make([]*structpb.Struct, 0, len(m.samples[key]))
		for _, row := range m.samples[key] {
			value, err := structpb.NewStruct(row)
			if err != nil {
				return nil, appsdk.NewError(appsdk.CodeBadRequest, "invalidSample", fmt.Sprintf("sample is not JSON serializable: %v", err))
			}
			sample = append(sample, value)
		}
		output.Sample = sample
	}
	return output, nil
}

func ValidateSample(definition *TableDefinition, sample []map[string]any) error {
	if len(sample) > MaxSampleRows {
		return appsdk.NewError(appsdk.CodeBadRequest, "invalidSample", fmt.Sprintf("sample must have at most %d rows", MaxSampleRows))
	}
	data, err := json.Marshal(sample)
	if err != nil {
		return appsdk.NewError(appsdk.CodeBadRequest, "invalidSample", fmt.Sprintf("sample is not JSON serializable: %v", err))
	}
	if len(data) > MaxSampleBytes {
		return appsdk.NewError(appsdk.CodeBadRequest, "invalidSample", fmt.Sprintf("sample must be at most %d bytes", MaxSampleBytes))
	}

	columns := make(map[string]struct{}, len(definition.GetColumns()))
	for _, column := range definition.GetColumns() {
		columns[column.GetName()] = struct{}{}
	}
	for rowIndex, row := range sample {
		for key := range row {
			if _, ok := columns[key]; !ok {
				return appsdk.NewError(appsdk.CodeBadRequest, "invalidSample", fmt.Sprintf("sample row %d has unknown column %q", rowIndex, key))
			}
		}
	}
	return nil
}

func tableKey(localCatalogAlias, tableName string) string {
	return strings.TrimSpace(localCatalogAlias) + "\x00" + strings.TrimSpace(tableName)
}

func decodePageToken(pageToken string) (int, error) {
	if pageToken == "" {
		return 0, nil
	}
	offset, err := strconv.Atoi(pageToken)
	if err != nil || offset < 0 {
		return 0, appsdk.NewError(appsdk.CodeBadRequest, "invalidParams", "pageToken must be a non-negative offset")
	}
	return offset, nil
}
