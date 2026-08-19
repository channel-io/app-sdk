import { z } from "zod";
import type {
  DataSourceCatalog as ProtoDataSourceCatalog,
  DataSourceAuthorizeQueryInput as ProtoAuthorizeQueryInput,
  DataSourceAuthorizeQueryOutput as ProtoAuthorizeQueryOutput,
  DataSourceColumn as ProtoDataSourceColumn,
  DataSourceDescribeTableInput as ProtoDescribeTableInput,
  DataSourceDescribeTableOutput as ProtoDescribeTableOutput,
  DataSourceListCatalogsInput as ProtoListCatalogsInput,
  DataSourceListCatalogsOutput as ProtoListCatalogsOutput,
  DataSourceListTablesInput as ProtoListTablesInput,
  DataSourceListTablesOutput as ProtoListTablesOutput,
  DataSourceQueryFilter as ProtoDataSourceQueryFilter,
  DataSourceQueryTableAccess as ProtoDataSourceQueryTableAccess,
  DataSourceTable as ProtoDataSourceTable,
  DataSourceTableDefinition as ProtoDataSourceTableDefinition,
  DataSourceTableListing as ProtoDataSourceTableListing,
} from "../gen/channel/app/sdk/v1/extension.js";
import type { Context } from "../types/context.js";
import type { ExtensionDefinition } from "../types/extension.js";

type ProtoBacked<T, Proto> = T & Proto;

const DataSourceNonEmptyStringSchema = z.string().min(1);

export const DataSourceDialectSchema = z.enum(["postgresql", "bigquery", "mysql"]);
export type DataSourceDialect = z.infer<typeof DataSourceDialectSchema>;

export const DataSourceTableTypeSchema = z.enum(["table", "view", "materialized_view", "external"]);
export type DataSourceTableType = z.infer<typeof DataSourceTableTypeSchema>;

export const DataSourceManagerAccessSchema = z.enum(["all", "owner"]);
export type DataSourceManagerAccess = z.infer<typeof DataSourceManagerAccessSchema>;

export const DataSourceCatalogSchema = z.object({
  alias: DataSourceNonEmptyStringSchema,
  displayName: z.string().optional(),
  dialect: DataSourceDialectSchema,
  active: z.boolean().optional(),
});
export type DataSourceCatalog = ProtoBacked<
  z.infer<typeof DataSourceCatalogSchema>,
  ProtoDataSourceCatalog
>;

export const DataSourceTableSchema = z.object({
  name: DataSourceNonEmptyStringSchema,
  localCatalogAlias: z.string().optional(),
  description: z.string().optional(),
  estimatedRowCount: z.number().int().nonnegative().optional(),
  updatedAt: z.number().int().nonnegative().optional(),
  tableType: DataSourceTableTypeSchema.optional(),
  managerAccess: DataSourceManagerAccessSchema.optional(),
});
export type DataSourceTable = ProtoBacked<
  z.infer<typeof DataSourceTableSchema>,
  ProtoDataSourceTable
>;

export const DataSourceColumnSchema = z.object({
  name: DataSourceNonEmptyStringSchema,
  type: DataSourceNonEmptyStringSchema,
  nullable: z.boolean(),
  description: z.string().optional(),
  partitionKey: z.boolean().optional(),
  precision: z.number().int().nonnegative().optional(),
  scale: z.number().int().nonnegative().optional(),
});
export type DataSourceColumn = ProtoBacked<
  z.infer<typeof DataSourceColumnSchema>,
  ProtoDataSourceColumn
>;

export const DataSourceTableDefinitionSchema = z.object({
  table: DataSourceTableSchema,
  columns: z.array(DataSourceColumnSchema),
  primaryKey: z.array(DataSourceNonEmptyStringSchema).optional(),
});
export type DataSourceTableDefinition = ProtoBacked<
  z.infer<typeof DataSourceTableDefinitionSchema>,
  ProtoDataSourceTableDefinition
>;

export const DataSourceTableListingSchema = z.object({
  table: DataSourceTableSchema,
  searchText: z.string().optional(),
  tags: z.array(DataSourceNonEmptyStringSchema).optional(),
});
export type DataSourceTableListing = ProtoBacked<
  z.infer<typeof DataSourceTableListingSchema>,
  ProtoDataSourceTableListing
>;
export type SearchedTable = DataSourceTableListing;

export const ListCatalogsInputSchema = z.object({});
export type ListCatalogsInput = ProtoBacked<
  z.infer<typeof ListCatalogsInputSchema>,
  ProtoListCatalogsInput
>;

export const ListCatalogsOutputSchema = z.object({
  catalogs: z.array(DataSourceCatalogSchema),
});
export type ListCatalogsOutput = ProtoBacked<
  z.infer<typeof ListCatalogsOutputSchema>,
  ProtoListCatalogsOutput
>;

export const ListTablesInputSchema = z.object({
  localCatalogAlias: z.string().optional(),
  updatedAfter: z.string().optional(),
  limit: z.number().int().positive().optional(),
  pageToken: z.string().optional(),
});
export type ListTablesInput = ProtoBacked<
  z.infer<typeof ListTablesInputSchema>,
  ProtoListTablesInput
>;

export const ListTablesOutputSchema = z.object({
  tables: z.array(DataSourceTableListingSchema),
  nextPageToken: z.string().optional(),
  metadataVersion: z.string().optional(),
});
export type ListTablesOutput = ProtoBacked<
  z.infer<typeof ListTablesOutputSchema>,
  ProtoListTablesOutput
>;

export const DescribeTableInputSchema = z.object({
  localCatalogAlias: z.string().optional(),
  tableName: DataSourceNonEmptyStringSchema,
  includeSample: z.boolean().optional(),
});
export type DescribeTableInput = ProtoBacked<
  z.infer<typeof DescribeTableInputSchema>,
  ProtoDescribeTableInput
>;

export const DescribeTableOutputSchema = z.object({
  definition: DataSourceTableDefinitionSchema,
  sample: z.array(z.record(z.string(), z.unknown())).optional(),
  metadataVersion: z.string().optional(),
});
export type DescribeTableOutput = ProtoBacked<
  z.infer<typeof DescribeTableOutputSchema>,
  ProtoDescribeTableOutput
>;

export const DataSourceQueryAuthorizationPolicy = {
  maxTables: 64,
  maxColumnsPerTable: 256,
  maxFilters: 64,
  maxValuesPerFilter: 1000,
  maxOutputBytes: 64 * 1024,
} as const;

export const DataSourceQueryTableAccessSchema = z
  .object({
    name: DataSourceNonEmptyStringSchema,
    columns: z
      .array(DataSourceNonEmptyStringSchema)
      .max(DataSourceQueryAuthorizationPolicy.maxColumnsPerTable)
      .refine(hasUniqueStrings, "DataSource query columns must be unique"),
  })
  .strict();
export type DataSourceQueryTableAccess = ProtoBacked<
  z.infer<typeof DataSourceQueryTableAccessSchema>,
  ProtoDataSourceQueryTableAccess
>;

export const AuthorizeQueryInputSchema = z
  .object({
    localCatalogAlias: DataSourceNonEmptyStringSchema,
    tables: z
      .array(DataSourceQueryTableAccessSchema)
      .min(1)
      .max(DataSourceQueryAuthorizationPolicy.maxTables)
      .refine(
        (tables) => hasUniqueStrings(tables.map((table) => table.name)),
        "DataSource query tables must be unique"
      ),
  })
  .strict();
export type AuthorizeQueryInput = ProtoBacked<
  z.infer<typeof AuthorizeQueryInputSchema>,
  ProtoAuthorizeQueryInput
>;

export const DataSourceQueryFilterSchema = z
  .object({
    table: DataSourceNonEmptyStringSchema,
    column: DataSourceNonEmptyStringSchema,
    values: z
      .array(z.string())
      .max(DataSourceQueryAuthorizationPolicy.maxValuesPerFilter)
      .refine(hasUniqueStrings, "DataSource query filter values must be unique"),
  })
  .strict();
export type DataSourceQueryFilter = ProtoBacked<
  z.infer<typeof DataSourceQueryFilterSchema>,
  ProtoDataSourceQueryFilter
>;

export const AuthorizeQueryOutputSchema = z
  .object({
    authorized: z.boolean(),
    filters: z
      .array(DataSourceQueryFilterSchema)
      .max(DataSourceQueryAuthorizationPolicy.maxFilters)
      .refine(
        (filters) =>
          hasUniqueStrings(filters.map((filter) => `${filter.table}\u0000${filter.column}`)),
        "DataSource query filters must target unique table and column pairs"
      )
      .optional(),
  })
  .strict()
  .refine(
    (output) =>
      utf8ByteLength(JSON.stringify(output)) <= DataSourceQueryAuthorizationPolicy.maxOutputBytes,
    `DataSource query authorization output must be at most ${DataSourceQueryAuthorizationPolicy.maxOutputBytes} bytes`
  );
export type AuthorizeQueryOutput = ProtoBacked<
  z.infer<typeof AuthorizeQueryOutputSchema>,
  ProtoAuthorizeQueryOutput
>;

export type DataSourceQueryAuthorizer = (
  ctx: Context,
  input: AuthorizeQueryInput
) => AuthorizeQueryOutput | Promise<AuthorizeQueryOutput>;

export interface DataSourceMetadataProvider {
  listCatalogs(
    ctx: Context,
    input: ListCatalogsInput
  ): ListCatalogsOutput | Promise<ListCatalogsOutput>;
  listTables(ctx: Context, input: ListTablesInput): ListTablesOutput | Promise<ListTablesOutput>;
  describeTable(
    ctx: Context,
    input: DescribeTableInput
  ): DescribeTableOutput | Promise<DescribeTableOutput>;
  authorizeQuery?: DataSourceQueryAuthorizer;
}

export interface StaticDataSourceMetadata {
  catalogs: DataSourceCatalog[];
  tables: DataSourceTableListing[];
  definitions: DataSourceTableDefinition[];
  samples?: Record<string, Record<string, unknown>[]>;
}

export const DataSourceSamplePolicy = {
  maxRows: 10,
  maxBytes: 64 * 1024,
} as const;

export type DataSourceIngestionEventRow<Row extends Record<string, unknown>> = Row & {
  channel_id: string;
  dedup_key: string;
  source_updated_at: string;
  event_type: string;
  source?: string;
  raw?: unknown;
};

export interface CreateDataSourceIngestionEventRowInput<Row extends Record<string, unknown>> {
  channelId: string;
  logicalId: string;
  eventType: string;
  sourceUpdatedAt: string | Date;
  row?: Row;
  raw?: unknown;
  source?: string;
  kind?: string;
  dedupKeyParts?: readonly unknown[];
}

export function createDataSourceIngestionEventRow<Row extends Record<string, unknown>>(
  input: CreateDataSourceIngestionEventRowInput<Row>
): DataSourceIngestionEventRow<Row> {
  const sourceUpdatedAt = normalizeDataSourceTimestamp(input.sourceUpdatedAt);
  const baseRow = { ...(input.row ?? ({} as Row)) };
  const raw = input.raw ?? baseRow;
  return {
    ...baseRow,
    channel_id: input.channelId,
    dedup_key: createDataSourceDedupKey({
      channelId: input.channelId,
      logicalId: input.logicalId,
      eventType: input.eventType,
      sourceUpdatedAt,
      fingerprint: input.dedupKeyParts ?? [raw],
      ...(input.kind ? { kind: input.kind } : {}),
    }),
    source_updated_at: sourceUpdatedAt,
    event_type: input.eventType,
    ...(input.source ? { source: input.source } : {}),
    ...(input.raw === undefined ? {} : { raw: input.raw }),
  };
}

export function createDataSourceDedupKey(input: {
  channelId: string;
  logicalId: string;
  eventType: string;
  sourceUpdatedAt: string | Date;
  kind?: string;
  fingerprint?: readonly unknown[];
}): string {
  const sourceUpdatedAt = normalizeDataSourceTimestamp(input.sourceUpdatedAt);
  return [
    input.kind ?? "event",
    input.channelId,
    input.logicalId,
    input.eventType,
    sourceUpdatedAt,
    stableHash(input.fingerprint ?? []),
  ].join(":");
}

export function normalizeDataSourceTimestamp(value: string | Date): string {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) {
    throw new Error("DataSource sourceUpdatedAt must be a valid timestamp");
  }
  return date.toISOString();
}

export function validateDataSourceSample(
  definition: DataSourceTableDefinition,
  sample: Record<string, unknown>[]
): void {
  if (sample.length > DataSourceSamplePolicy.maxRows) {
    throw new Error(`DataSource sample must have at most ${DataSourceSamplePolicy.maxRows} rows`);
  }

  const encoded = JSON.stringify(sample);
  if (utf8ByteLength(encoded) > DataSourceSamplePolicy.maxBytes) {
    throw new Error(`DataSource sample must be at most ${DataSourceSamplePolicy.maxBytes} bytes`);
  }

  const columns = new Set(definition.columns.map((column) => column.name));
  sample.forEach((row, rowIndex) => {
    for (const key of Object.keys(row)) {
      if (!columns.has(key)) {
        throw new Error(`DataSource sample row ${rowIndex} has unknown column: ${key}`);
      }
    }
  });
}

export function createDataSourceExtension(
  provider: DataSourceMetadataProvider
): ExtensionDefinition {
  const authorizeQuery = provider.authorizeQuery;
  return {
    name: "datasource",
    systemVersion: "v1",
    groups: {
      catalog: {
        listCatalogs: {
          description: "Return datasource catalogs exposed by this app.",
          input: ListCatalogsInputSchema,
          output: ListCatalogsOutputSchema,
          handler: async (ctx, input) => {
            const params = ListCatalogsInputSchema.parse(input);
            return ListCatalogsOutputSchema.parse(await provider.listCatalogs(ctx, params));
          },
        },
        listTables: {
          description: "Return lightweight datasource table metadata.",
          input: ListTablesInputSchema,
          output: ListTablesOutputSchema,
          handler: async (ctx, input) => {
            const params = ListTablesInputSchema.parse(input);
            return ListTablesOutputSchema.parse(await provider.listTables(ctx, params));
          },
        },
        describeTable: {
          description: "Return detailed datasource table metadata.",
          input: DescribeTableInputSchema,
          output: DescribeTableOutputSchema,
          handler: async (ctx, input) => {
            const params = DescribeTableInputSchema.parse(input);
            const output = DescribeTableOutputSchema.parse(
              await provider.describeTable(ctx, params)
            );
            if (output.sample) {
              validateDataSourceSample(output.definition, output.sample);
            }
            return output;
          },
        },
      },
      ...(authorizeQuery
        ? {
            query: {
              authorizeQuery: {
                description:
                  "Authorize a datasource access plan and return bounded row allow-list filters.",
                input: AuthorizeQueryInputSchema,
                output: AuthorizeQueryOutputSchema,
                handler: async (ctx, input) => {
                  const params = AuthorizeQueryInputSchema.parse(input);
                  return AuthorizeQueryOutputSchema.parse(await authorizeQuery(ctx, params));
                },
              },
            },
          }
        : {}),
    },
  };
}

export function createStaticDataSourceExtension(
  metadata: StaticDataSourceMetadata
): ExtensionDefinition {
  const catalogs = metadata.catalogs.map((catalog) => DataSourceCatalogSchema.parse(catalog));
  const tables = metadata.tables.map((table) => DataSourceTableListingSchema.parse(table));
  const definitions = new Map(
    metadata.definitions.map((definition) => {
      const parsed = DataSourceTableDefinitionSchema.parse(definition);
      return [tableKey(parsed.table.localCatalogAlias, parsed.table.name), parsed] as const;
    })
  );

  return createDataSourceExtension({
    listCatalogs: () => ({ catalogs }),
    listTables: (_ctx, input) => {
      const offset = parsePageToken(input.pageToken);
      const filtered = tables.filter(
        (table) =>
          !input.localCatalogAlias || table.table.localCatalogAlias === input.localCatalogAlias
      );
      const limit = input.limit ?? filtered.length;
      const end = Math.min(offset + limit, filtered.length);
      return {
        tables: filtered.slice(offset, end),
        ...(end < filtered.length ? { nextPageToken: String(end) } : {}),
      };
    },
    describeTable: (_ctx, input) => {
      const definition = definitions.get(tableKey(input.localCatalogAlias, input.tableName));
      if (!definition) {
        throw new Error("DataSource table definition not found");
      }
      const sample = metadata.samples?.[tableKey(input.localCatalogAlias, input.tableName)];
      if (input.includeSample && sample) {
        validateDataSourceSample(definition, sample);
        return { definition, sample };
      }
      return { definition };
    },
  });
}

function tableKey(localCatalogAlias: string | undefined, tableName: string): string {
  return `${localCatalogAlias ?? ""}\u0000${tableName}`;
}

function parsePageToken(pageToken: string | undefined): number {
  if (!pageToken) {
    return 0;
  }
  const offset = Number(pageToken);
  if (!Number.isInteger(offset) || offset < 0) {
    throw new Error("DataSource pageToken must be a non-negative offset");
  }
  return offset;
}

function hasUniqueStrings(values: readonly string[]): boolean {
  return new Set(values).size === values.length;
}

function stableHash(value: unknown): string {
  const text = stableStringify(value);
  let hash = 0xcbf29ce484222325n;
  const prime = 0x100000001b3n;
  const mask = 0xffffffffffffffffn;
  for (let index = 0; index < text.length; index += 1) {
    hash ^= BigInt(text.charCodeAt(index));
    hash = (hash * prime) & mask;
  }
  return hash.toString(16).padStart(16, "0");
}

function stableStringify(value: unknown): string {
  if (value === null || typeof value !== "object") {
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) {
    return `[${value.map((item) => stableStringify(item)).join(",")}]`;
  }
  const record = value as Record<string, unknown>;
  return `{${Object.keys(record)
    .sort()
    .map((key) => `${JSON.stringify(key)}:${stableStringify(record[key])}`)
    .join(",")}}`;
}

function utf8ByteLength(value: string): number {
  let bytes = 0;
  for (let index = 0; index < value.length; index += 1) {
    const codePoint = value.codePointAt(index) ?? 0;
    if (codePoint > 0xffff) {
      index += 1;
    }
    if (codePoint <= 0x7f) {
      bytes += 1;
    } else if (codePoint <= 0x7ff) {
      bytes += 2;
    } else if (codePoint <= 0xffff) {
      bytes += 3;
    } else {
      bytes += 4;
    }
  }
  return bytes;
}
