import type { Context } from "../../types/context.js";
import type {
  AuthorizeQueryInput,
  AuthorizeQueryOutput,
  DescribeTableInput,
  DescribeTableOutput,
  ListCatalogsInput,
  ListCatalogsOutput,
  ListTablesInput,
  ListTablesOutput,
} from "../datasource.js";

export type {
  DataSourceCatalog,
  DataSourceColumn,
  DataSourceDialect,
  DataSourceManagerAccess,
  DataSourceTable,
  DataSourceTableDefinition,
  DataSourceTableListing,
  DataSourceTableType,
  DescribeTableInput,
  DescribeTableOutput,
  ListCatalogsInput,
  ListCatalogsOutput,
  ListTablesInput,
  ListTablesOutput,
  SearchedTable,
  AuthorizeQueryInput,
  AuthorizeQueryOutput,
  DataSourceQueryFilter,
  DataSourceQueryTableAccess,
} from "../datasource.js";

export interface DataSourceExtensionInterface {
  /**
   * Return datasource catalogs exposed by this app.
   *
   * Function name: "catalog.listCatalogs"
   */
  listCatalogs(ctx: Context, params: ListCatalogsInput): Promise<ListCatalogsOutput>;

  /**
   * Return lightweight datasource table metadata.
   *
   * Function name: "catalog.listTables"
   */
  listTables(ctx: Context, params: ListTablesInput): Promise<ListTablesOutput>;

  /**
   * Return detailed datasource table metadata.
   *
   * Function name: "catalog.describeTable"
   */
  describeTable(ctx: Context, params: DescribeTableInput): Promise<DescribeTableOutput>;

  /**
   * Optionally authorize an actual datasource query from its canonical table/column access plan.
   * Raw SQL is never included in params.
   *
   * Function name: "query.authorizeQuery"
   */
  authorizeQuery?(ctx: Context, params: AuthorizeQueryInput): Promise<AuthorizeQueryOutput>;
}

export const DataSourceFunctionNames = {
  listCatalogs: "catalog.listCatalogs",
  listTables: "catalog.listTables",
  describeTable: "catalog.describeTable",
  authorizeQuery: "query.authorizeQuery",
} as const;
