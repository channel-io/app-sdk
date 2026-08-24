import { describe, expect, it } from "vitest";
import type {
  DataSourceAuthorizeQueryInput as ProtoAuthorizeQueryInput,
  DataSourceAuthorizeQueryOutput as ProtoAuthorizeQueryOutput,
  DataSourceDescribeTableOutput as ProtoDescribeTableOutput,
  DataSourceListCatalogsOutput as ProtoListCatalogsOutput,
} from "../../gen/channel/app/sdk/v1/extension.js";
import {
  createDataSourceDedupKey,
  createDataSourceExtension,
  createDataSourceIngestionEventRow,
  createStaticDataSourceExtension,
  AuthorizeQueryInputSchema,
  AuthorizeQueryOutputSchema,
  DataSourceDialectSchema,
  DataSourceFunctionNames,
  DataSourceTableSchema,
  DescribeTableOutputSchema,
  ListCatalogsOutputSchema,
  validateDataSourceSample,
} from "../../extensions/index.js";
import { registerExtension } from "../../schemas/index.js";

const tableDefinition = {
  table: {
    name: "orders",
    localCatalogAlias: "bigquery",
    description: "Cafe24 orders synced to BigQuery.",
    tableType: "table" as const,
    managerAccess: "owner" as const,
    permissions: [
      { action: "financeUpdate", scope: "none" },
      { action: "futureProtoAction", scope: "futureProtoScope" },
    ],
  },
  columns: [
    { name: "channel_id", type: "STRING", nullable: false, partitionKey: true },
    { name: "order_id", type: "STRING", nullable: false },
  ],
  primaryKey: ["channel_id", "order_id"],
};

describe("datasource extension schemas", () => {
  it("accepts every supported datasource dialect", () => {
    expect(DataSourceDialectSchema.options).toEqual(["postgresql", "bigquery", "mysql"]);
    expect(DataSourceDialectSchema.parse("mysql")).toBe("mysql");
  });

  it("preserves table permission metadata in describe output", () => {
    const catalogs = ListCatalogsOutputSchema.parse({
      catalogs: [{ alias: "bigquery", dialect: "bigquery", displayName: "Cafe24 BigQuery" }],
    });
    const described = DescribeTableOutputSchema.parse({
      definition: tableDefinition,
      sample: [{ channel_id: "channel-1", order_id: "o-1" }],
    });
    const protoCatalogs: ProtoListCatalogsOutput = catalogs;
    const protoDescribed: ProtoDescribeTableOutput = described;

    expect(protoCatalogs.catalogs?.[0]?.dialect).toBe("bigquery");
    expect(protoDescribed.definition?.primaryKey).toEqual(["channel_id", "order_id"]);
    expect(protoDescribed.definition?.table?.managerAccess).toBe("owner");
    expect(protoDescribed.definition?.table?.permissions).toEqual([
      { action: "financeUpdate", scope: "none" },
      { action: "futureProtoAction", scope: "futureProtoScope" },
    ]);
  });

  it("accepts all and owner manager access while keeping it optional", () => {
    expect(
      DataSourceTableSchema.parse({ name: "public_orders", managerAccess: "all" })
    ).toMatchObject({ managerAccess: "all" });
    expect(
      DataSourceTableSchema.parse({ name: "private_orders", managerAccess: "owner" })
    ).toMatchObject({ managerAccess: "owner" });
    expect(DataSourceTableSchema.parse({ name: "legacy_orders" })).toEqual({
      name: "legacy_orders",
    });
    expect(() =>
      DataSourceTableSchema.parse({ name: "invalid_orders", managerAccess: "managers" })
    ).toThrow();
  });

  it("creates required metadata functions", async () => {
    const extension = createDataSourceExtension({
      listCatalogs: async () => ({
        catalogs: [{ alias: "bigquery", dialect: "bigquery" }],
      }),
      listTables: async () => ({
        tables: [{ table: tableDefinition.table }],
      }),
      describeTable: async () => ({ definition: tableDefinition }),
    });
    const registered = registerExtension(extension);

    expect(registered.name).toBe("datasource");
    expect(registered.functions.map((fn) => fn.name)).toEqual([
      "catalog.listCatalogs",
      "catalog.listTables",
      "catalog.describeTable",
    ]);
    const listTables = registered.functions.find(
      (fn) => fn.name === DataSourceFunctionNames.listTables
    );
    await expect(
      listTables?.handler(
        { caller: { type: "system" }, channel: { id: "" }, app: { id: "app-1" } },
        {}
      )
    ).resolves.toMatchObject({
      tables: [{ table: { permissions: tableDefinition.table.permissions } }],
    });
  });

  it("registers query authorization only when the provider implements it", async () => {
    const inputs: ProtoAuthorizeQueryInput[] = [];
    const extension = createDataSourceExtension({
      listCatalogs: async () => ({ catalogs: [] }),
      listTables: async () => ({ tables: [] }),
      describeTable: async () => ({ definition: tableDefinition }),
      authorizeQuery: async (_ctx, input) => {
        inputs.push(input);
        return {
          authorized: true,
          filters: [{ table: "orders", column: "scope_key", values: [] }],
        };
      },
    });
    const registered = registerExtension(extension);
    const authorize = registered.functions.find(
      (fn) => fn.name === DataSourceFunctionNames.authorizeQuery
    );

    const output = (await authorize?.handler(
      { caller: { type: "system" }, channel: { id: "channel-1" }, app: { id: "app-1" } },
      {
        localCatalogAlias: "bigquery",
        tables: [{ name: "orders", columns: ["scope_key"] }],
      }
    )) as ProtoAuthorizeQueryOutput | undefined;

    expect(registered.functions.map((fn) => fn.name)).toContain("query.authorizeQuery");
    expect(inputs).toEqual([
      {
        localCatalogAlias: "bigquery",
        tables: [{ name: "orders", columns: ["scope_key"] }],
      },
    ]);
    expect(output).toEqual({
      authorized: true,
      filters: [{ table: "orders", column: "scope_key", values: [] }],
    });
  });

  it("rejects duplicate and oversized query authorization values", () => {
    expect(() =>
      AuthorizeQueryInputSchema.parse({
        localCatalogAlias: "bigquery",
        tables: [
          { name: "orders", columns: [] },
          { name: "orders", columns: [] },
        ],
      })
    ).toThrow(/tables must be unique/);
    expect(() =>
      AuthorizeQueryInputSchema.parse({
        localCatalogAlias: "bigquery",
        tables: [{ name: "orders", columns: [] }],
        rawSql: "SELECT * FROM orders",
      })
    ).toThrow();
    expect(() =>
      AuthorizeQueryOutputSchema.parse({
        authorized: true,
        filters: [{ table: "orders", column: "scope_key", values: ["scope-1", "scope-1"] }],
      })
    ).toThrow(/values must be unique/);
    expect(() =>
      AuthorizeQueryOutputSchema.parse({
        authorized: true,
        filters: [{ table: "orders", column: "scope_key", values: ["x".repeat(64 * 1024)] }],
      })
    ).toThrow(/at most 65536 bytes/);
  });

  it("creates static metadata functions with paging and samples", async () => {
    const extension = createStaticDataSourceExtension({
      catalogs: [{ alias: "bigquery", dialect: "bigquery" }],
      tables: [
        {
          table: {
            name: "orders",
            localCatalogAlias: "bigquery",
            managerAccess: "owner",
            permissions: tableDefinition.table.permissions,
          },
        },
        { table: { name: "products", localCatalogAlias: "bigquery" } },
      ],
      definitions: [tableDefinition],
      samples: {
        ["bigquery\u0000orders"]: [{ channel_id: "channel-1", order_id: "o-1" }],
      },
    });
    const registered = registerExtension(extension);
    const listTables = registered.functions.find((fn) => fn.name === "catalog.listTables");
    const describeTable = registered.functions.find((fn) => fn.name === "catalog.describeTable");

    const listResult = await listTables?.handler(
      { caller: { id: "manager-1" }, channel: { id: "channel-1" }, app: { id: "app-1" } },
      { localCatalogAlias: "bigquery", limit: 1 }
    );
    const describeResult = await describeTable?.handler(
      { caller: { id: "manager-1" }, channel: { id: "channel-1" }, app: { id: "app-1" } },
      { tableName: "orders", localCatalogAlias: "bigquery", includeSample: true }
    );

    expect(listResult).toMatchObject({
      tables: [
        {
          table: {
            name: "orders",
            managerAccess: "owner",
            permissions: tableDefinition.table.permissions,
          },
        },
      ],
      nextPageToken: "1",
    });
    expect(describeResult).toMatchObject({
      sample: [{ channel_id: "channel-1", order_id: "o-1" }],
    });
  });

  it("rejects samples with unknown columns", () => {
    expect(() => validateDataSourceSample(tableDefinition, [{ unknown: "value" }])).toThrow();
  });

  it("creates deterministic datasource ingestion event rows", () => {
    const row = createDataSourceIngestionEventRow({
      kind: "order",
      channelId: "channel-1",
      logicalId: "po-1",
      eventType: "PAYED",
      sourceUpdatedAt: "2026-07-01T10:00:00+09:00",
      source: "naver-smart-store",
      row: { product_order_id: "po-1", amount: 1000 },
      raw: { b: 2, a: 1 },
    });
    const dedupKey = createDataSourceDedupKey({
      kind: "order",
      channelId: "channel-1",
      logicalId: "po-1",
      eventType: "PAYED",
      sourceUpdatedAt: "2026-07-01T01:00:00.000Z",
      fingerprint: [{ a: 1, b: 2 }],
    });

    expect(row).toMatchObject({
      product_order_id: "po-1",
      amount: 1000,
      channel_id: "channel-1",
      source_updated_at: "2026-07-01T01:00:00.000Z",
      event_type: "PAYED",
      source: "naver-smart-store",
      raw: { b: 2, a: 1 },
    });
    expect(row.dedup_key).toBe(dedupKey);
  });

  it("exposes extension-relative function names for decorator implementations", () => {
    expect(DataSourceFunctionNames).toEqual({
      listCatalogs: "catalog.listCatalogs",
      listTables: "catalog.listTables",
      describeTable: "catalog.describeTable",
      authorizeQuery: "query.authorizeQuery",
    });
  });
});
