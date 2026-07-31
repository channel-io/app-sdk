package datasource

import sdkv1 "github.com/channel-io/app-sdk/go/internal/gen/channel/app/sdk/v1"

const (
	DialectPostgreSQL = "postgresql"
	DialectBigQuery   = "bigquery"
)

const (
	TableTypeTable            = "table"
	TableTypeView             = "view"
	TableTypeMaterializedView = "materialized_view"
	TableTypeExternal         = "external"
)

const (
	ManagerAccessAll   = "all"
	ManagerAccessOwner = "owner"
)

type Catalog = sdkv1.DataSourceCatalog
type Table = sdkv1.DataSourceTable
type Column = sdkv1.DataSourceColumn
type TableDefinition = sdkv1.DataSourceTableDefinition
type TableListing = sdkv1.DataSourceTableListing
type SearchedTable = sdkv1.DataSourceTableListing

type ProtoCatalog = sdkv1.DataSourceCatalog
type ProtoTable = sdkv1.DataSourceTable
type ProtoColumn = sdkv1.DataSourceColumn
type ProtoTableDefinition = sdkv1.DataSourceTableDefinition
type ProtoTableListing = sdkv1.DataSourceTableListing
type ProtoListCatalogsInput = sdkv1.DataSourceListCatalogsInput
type ProtoListCatalogsOutput = sdkv1.DataSourceListCatalogsOutput
type ProtoListTablesInput = sdkv1.DataSourceListTablesInput
type ProtoListTablesOutput = sdkv1.DataSourceListTablesOutput
type ProtoDescribeTableInput = sdkv1.DataSourceDescribeTableInput
type ProtoDescribeTableOutput = sdkv1.DataSourceDescribeTableOutput
type ProtoQueryTableAccess = sdkv1.DataSourceQueryTableAccess
type ProtoQueryFilter = sdkv1.DataSourceQueryFilter
type ProtoAuthorizeQueryInput = sdkv1.DataSourceAuthorizeQueryInput
type ProtoAuthorizeQueryOutput = sdkv1.DataSourceAuthorizeQueryOutput

type ListCatalogsInput = sdkv1.DataSourceListCatalogsInput
type ListCatalogsOutput = sdkv1.DataSourceListCatalogsOutput
type ListTablesInput = sdkv1.DataSourceListTablesInput
type ListTablesOutput = sdkv1.DataSourceListTablesOutput
type DescribeTableInput = sdkv1.DataSourceDescribeTableInput
type DescribeTableOutput = sdkv1.DataSourceDescribeTableOutput
type QueryTableAccess = sdkv1.DataSourceQueryTableAccess
type QueryFilter = sdkv1.DataSourceQueryFilter
type AuthorizeQueryInput = sdkv1.DataSourceAuthorizeQueryInput
type AuthorizeQueryOutput = sdkv1.DataSourceAuthorizeQueryOutput
