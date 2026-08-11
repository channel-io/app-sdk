import { createRequire } from "node:module";
import { describe, expect, it } from "vitest";
import {
  BigQueryDataSourceExecutor,
  DataSourceErrorCode,
  PostgresDataSourceExecutor,
  queryWithRowLimit,
  validateReadOnlyQuery,
  writeRowsAsArrowIpcBatch,
} from "../datasource/index.js";
import type {
  BigQueryClientLike,
  BigQueryJobLike,
  BigQueryReadClientLike,
  PostgresClientLike,
  QueryChunk,
  QueryChunkSink,
} from "../datasource/index.js";

describe("datasource policy helpers", () => {
  it("validates read-only queries and wraps row limits", () => {
    expect(() =>
      validateReadOnlyQuery("select * from orders", [], [{ name: "orders" }])
    ).not.toThrow();
    expect(() =>
      validateReadOnlyQuery(
        "SELECT\n  COUNT(*) AS order_count\nFROM orders",
        ["orders"],
        [{ name: "orders" }]
      )
    ).not.toThrow();
    expect(() =>
      validateReadOnlyQuery(
        "WITH\n  recent_orders AS (SELECT id FROM orders)\nSELECT COUNT(*) FROM recent_orders",
        ["orders"],
        [{ name: "orders" }]
      )
    ).not.toThrow();
    expect(() => validateReadOnlyQuery("delete from orders", [], [{ name: "orders" }])).toThrow(
      "read-only SELECT"
    );
    expect(queryWithRowLimit("select * from orders;", 10)).toBe(
      "SELECT * FROM (select * from orders) AS datasource_query LIMIT 10"
    );
    expect(queryWithRowLimit(`select * from orders${";".repeat(10_000)}`, 10)).toBe(
      "SELECT * FROM (select * from orders) AS datasource_query LIMIT 10"
    );
    expect(
      queryWithRowLimit(
        "WITH RECURSIVE seq AS (SELECT 1 AS n UNION ALL SELECT n + 1 FROM seq WHERE n < 3) SELECT * FROM seq;",
        10
      )
    ).toBe(
      "WITH RECURSIVE seq AS (SELECT 1 AS n UNION ALL SELECT n + 1 FROM seq WHERE n < 3) SELECT * FROM (SELECT * FROM seq) AS datasource_query LIMIT 10"
    );
    expect(
      queryWithRowLimit(
        "WITH /* recursive query */ RECURSIVE seq AS (SELECT 1 AS n)\n-- final query\nSELECT * FROM seq",
        10
      )
    ).toBe(
      "WITH /* recursive query */ RECURSIVE seq AS (SELECT 1 AS n)\n-- final query\nSELECT * FROM (SELECT * FROM seq) AS datasource_query LIMIT 10"
    );
  });

  it("accepts comments and literals in read-only queries", () => {
    const queries = [
      "-- generated query; do not update\nSELECT * FROM orders",
      "# generated query; do not delete\nSELECT * FROM orders",
      "/* generated query; do not insert */\nSELECT * FROM orders",
      "SELECT * /* delete; update */ FROM orders -- drop;\n",
      "SELECT 'delete; update' AS note FROM orders",
      "SELECT 'don''t delete; update' AS note FROM orders",
      "SELECT $$delete; update$$ AS note FROM orders",
      "SELECT * FROM `project.dataset.orders`",
    ];

    for (const query of queries) {
      expect(() => validateReadOnlyQuery(query, [], [{ name: "orders" }])).not.toThrow();
    }
  });

  it("rejects executable writes hidden after comments and literals", () => {
    const queries = [
      "-- generated query\nUPDATE orders SET id = 'x'",
      "SELECT * FROM orders; DELETE FROM orders",
      "WITH changed AS (UPDATE orders SET id = 'x') SELECT * FROM changed",
      "SELECT * FROM orders /* unfinished",
      "SELECT * FROM orders; -- wrapper would be invalid",
      "SELECT payload #>> '{path}' FROM orders; DELETE FROM orders",
      "SELECT 1 /* /* */ ; DELETE FROM orders */",
      "SELECT 'a\\'' AS note FROM orders",
    ];

    for (const query of queries) {
      expect(() => validateReadOnlyQuery(query)).toThrow("read-only SELECT");
    }
  });

  it("allows tableless queries with configured tables", () => {
    for (const query of ["SELECT 'orders' AS note", "SELECT 1 /* FROM orders */"]) {
      expect(() => validateReadOnlyQuery(query, [], [{ name: "orders" }])).not.toThrow();
    }
  });

  it("defers table authorization and dialect syntax to App Store and the provider", () => {
    for (const query of [
      "SELECT * FROM customers",
      "SELECT * FROM UNNEST([1, 2, 3])",
      "SELECT * FROM (SELECT 1)",
    ]) {
      expect(() => validateReadOnlyQuery(query, [], [{ name: "orders" }])).not.toThrow();
    }
  });
});

describe("Arrow row conversion", () => {
  it("serializes row batches as schema and body frames", () => {
    const sink = new CaptureSink();

    const result = writeRowsAsArrowIpcBatch(
      sink,
      [
        { name: "id", dataTypeID: 23 },
        { name: "name", dataTypeID: 25 },
      ],
      [
        [1, "alpha"],
        [2, "beta"],
      ]
    );

    expect(result.schemaSent).toBe(true);
    expect(sink.schemas).toHaveLength(1);
    expect(sink.batches.length).toBeGreaterThan(0);

    const arrow = loadApacheArrowForTest();
    const table = arrow.tableFromIPC(concatBytes([...sink.frames, arrowEos()]));
    expect(table.numRows).toBe(2);
    expect(table.schema.fields.map((field) => field.name)).toEqual(["id", "name"]);
  });
});

describe("PostgresDataSourceExecutor", () => {
  it("streams pg-query-stream rows in bounded Arrow batches", async () => {
    const client = new FakePostgresClient([
      [1, "first"],
      [2, "second"],
      [3, "third"],
    ]);
    const executor = new PostgresDataSourceExecutor({
      sources: [
        {
          sourceId: "postgresql",
          pool: { connect: async () => client },
          tables: [{ name: "orders" }],
          batchSize: 2,
        },
      ],
    });
    const sink = new CaptureSink();

    await executor.executeQuery(
      {
        session: { channelId: "channel-1" },
        sourceId: "postgresql",
        query: "select * from orders",
        rowLimit: 100,
        byteLimit: 1024 * 1024,
        timeoutMs: 1000,
      },
      sink
    );

    expect(client.sqlQueries).toEqual([
      "BEGIN READ ONLY",
      "SET LOCAL statement_timeout = 1000",
      "COMMIT",
    ]);
    expect(client.streamQueryText).toBe(
      "SELECT * FROM (select * from orders) AS datasource_query LIMIT 100"
    );
    expect(sink.schemas).toHaveLength(1);
    expect(sink.batches.length).toBeGreaterThanOrEqual(2);
    expect(sink.results).toEqual([{ rowCount: 3, limitExceeded: false }]);
  });

  it("uses PostgreSQL NUMERIC typmod for Arrow decimal precision and scale", async () => {
    const client = new FakePostgresClient(
      [["123.456789"]],
      [{ name: "amount", dataTypeID: 1700, dataTypeModifier: postgresNumericTypmod(20, 6) }]
    );
    const executor = new PostgresDataSourceExecutor({
      sources: [
        {
          sourceId: "postgresql",
          pool: { connect: async () => client },
          tables: [{ name: "orders" }],
        },
      ],
    });
    const sink = new CaptureSink();

    await executor.executeQuery(
      {
        sourceId: "postgresql",
        query: "select amount from orders",
        rowLimit: 10,
      },
      sink
    );

    const arrow = loadApacheArrowForTest();
    const table = arrow.tableFromIPC(concatBytes([...sink.frames, arrowEos()]));
    const amountType = table.schema.fields[0]?.type;

    expect(amountType).toMatchObject({ precision: 20, scale: 6, bitWidth: 128 });
    expect(table.getChild("amount")?.get(0)?.valueOf(6)).toBe(123.456789);
  });
});

describe("BigQueryDataSourceExecutor", () => {
  it("runs a query job and relays BigQuery Storage Arrow chunks", async () => {
    const job = new FakeBigQueryJob();
    const bigQueryClient = new FakeBigQueryClient(job);
    const readClient = new FakeBigQueryReadClient();
    const executor = new BigQueryDataSourceExecutor({
      projectId: "project-1",
      bigQueryClient,
      readClient,
      sources: [
        {
          sourceId: "bigquery",
          datasetId: "app_cafe24",
          maximumBytesBilled: "1048576",
          tables: [{ name: "orders" }],
        },
      ],
    });
    const sink = new CaptureSink();

    await executor.executeQuery(
      {
        session: { channelId: "channel-1" },
        sourceId: "bigquery",
        query: "select * from orders",
        rowLimit: 10,
        byteLimit: 1024 * 1024,
        timeoutMs: 2000,
      },
      sink
    );

    expect(bigQueryClient.options?.query).toBe(
      "SELECT * FROM (select * from orders) AS datasource_query LIMIT 10"
    );
    expect(bigQueryClient.options?.maximumBytesBilled).toBe("1048576");
    expect(readClient.createReadSessionRequest?.readSession.table).toBe(
      "projects/project-1/datasets/_anon/tables/job_result"
    );
    expect(sink.schemas).toHaveLength(1);
    expect(sink.batches).toHaveLength(2);
    expect(sink.results).toEqual([{ rowCount: 3, limitExceeded: false }]);

    const arrow = loadApacheArrowForTest();
    const table = arrow.tableFromIPC(concatBytes([...sink.frames, arrowEos()]));
    expect(table.numRows).toBe(3);
    expect(table.schema.fields.map((field) => field.name)).toEqual(["id"]);
  });

  it("maps BigQuery failures to external datasource errors", async () => {
    const bigQueryClient: BigQueryClientLike = {
      createQueryJob: async () => {
        const error = new Error("denied") as Error & { code: string };
        error.code = "accessDenied";
        throw error;
      },
    };
    const executor = new BigQueryDataSourceExecutor({
      projectId: "project-1",
      bigQueryClient,
      readClient: new FakeBigQueryReadClient(),
      sources: [{ sourceId: "bigquery", datasetId: "app_cafe24" }],
    });

    await expect(
      executor.executeQuery(
        {
          session: { channelId: "channel-1" },
          sourceId: "bigquery",
          query: "select 1",
          rowLimit: 10,
          byteLimit: 100,
          timeoutMs: 1000,
        },
        new CaptureSink()
      )
    ).rejects.toMatchObject({
      code: DataSourceErrorCode.ExternalError,
      upstream: { engine: "bigquery", code: "accessDenied" },
    });
  });
});

class CaptureSink implements QueryChunkSink {
  readonly frames: Uint8Array[] = [];
  readonly schemas: Uint8Array[] = [];
  readonly batches: Uint8Array[] = [];
  readonly batchMessages: Uint8Array[] = [];
  readonly results: { rowCount: number; limitExceeded: boolean }[] = [];

  send(chunk: QueryChunk): void {
    const header = chunk.arrow?.dataHeader;
    const body = chunk.arrow?.dataBody;
    if (header) {
      this.frames.push(header);
      if (!body) {
        this.schemas.push(header);
      }
    }
    if (body) {
      this.frames.push(body);
      this.batches.push(body);
      if (header) {
        this.batchMessages.push(concatBytes([header, body]));
      }
    }
    if (chunk.result) {
      this.results.push({
        rowCount: chunk.result.rowCount ?? 0,
        limitExceeded: chunk.result.limitExceeded ?? false,
      });
    }
  }
}

class FakePostgresClient implements PostgresClientLike {
  readonly sqlQueries: string[] = [];
  streamQueryText: string | undefined;

  constructor(
    private readonly rows: (readonly unknown[])[],
    private readonly fields: FakePostgresField[] = [
      { name: "id", dataTypeID: 23 },
      { name: "name", dataTypeID: 25 },
    ]
  ) {}

  query(query: unknown): unknown {
    if (typeof query === "string") {
      this.sqlQueries.push(query);
      return Promise.resolve();
    }
    const queryStream = query as {
      cursor?: { text?: string };
      _result?: { fields?: FakePostgresField[] };
    };
    if (queryStream.cursor?.text) {
      this.streamQueryText = queryStream.cursor.text;
    }
    queryStream._result = {
      fields: this.fields,
    };
    return asyncRows(this.rows);
  }

  release(): void {}
}

interface FakePostgresField {
  name: string;
  dataTypeID: number;
  dataTypeModifier?: number;
}

class FakeBigQueryClient implements BigQueryClientLike {
  options?: {
    query?: string;
    maximumBytesBilled?: string;
  };

  constructor(private readonly job: BigQueryJobLike) {}

  async createQueryJob(options: { query?: string; maximumBytesBilled?: string }) {
    this.options = options;
    return [this.job] as [BigQueryJobLike];
  }
}

class FakeBigQueryJob implements BigQueryJobLike {
  async getQueryResults(): Promise<unknown> {
    return undefined;
  }

  async getMetadata() {
    return [
      {
        configuration: {
          query: {
            destinationTable: {
              projectId: "project-1",
              datasetId: "_anon",
              tableId: "job_result",
            },
          },
        },
      },
    ] as Awaited<ReturnType<BigQueryJobLike["getMetadata"]>>;
  }
}

class FakeBigQueryReadClient implements BigQueryReadClientLike {
  private readonly arrow = arrowStorageMessagesForTest();

  createReadSessionRequest?: {
    readSession: {
      table: string;
    };
  };

  async createReadSession(request: { readSession: { table: string } }) {
    this.createReadSessionRequest = request;
    return [
      {
        arrowSchema: { serializedSchema: this.arrow.schema },
        streams: [{ name: "stream-1" }],
      },
    ] as Awaited<ReturnType<BigQueryReadClientLike["createReadSession"]>>;
  }

  readRows(): AsyncIterable<{
    arrowRecordBatch?: { serializedRecordBatch?: Uint8Array };
    rowCount?: number;
  }> {
    const [firstBatch, secondBatch] = this.arrow.batches;
    if (!firstBatch || !secondBatch) {
      throw new Error("BigQuery Arrow test batches are missing");
    }
    return asyncRows([
      { arrowRecordBatch: { serializedRecordBatch: firstBatch }, rowCount: 2 },
      { arrowRecordBatch: { serializedRecordBatch: secondBatch }, rowCount: 1 },
    ]);
  }
}

function arrowStorageMessagesForTest(): { schema: Uint8Array; batches: Uint8Array[] } {
  const first = new CaptureSink();
  writeRowsAsArrowIpcBatch(first, [{ name: "id", dataTypeID: 23 }], [[1], [2]]);

  const second = new CaptureSink();
  writeRowsAsArrowIpcBatch(second, [{ name: "id", dataTypeID: 23 }], [[3]]);

  const schema = first.schemas[0];
  const firstBatch = first.batchMessages[0];
  const secondBatch = second.batchMessages[0];
  if (!schema || !firstBatch || !secondBatch) {
    throw new Error("failed to build Arrow IPC test messages");
  }

  return { schema, batches: [firstBatch, secondBatch] };
}

async function* asyncRows<T>(rows: readonly T[]): AsyncIterable<T> {
  for (const row of rows) {
    yield row;
  }
}

function concatBytes(chunks: readonly Uint8Array[]): Uint8Array {
  const total = chunks.reduce((sum, chunk) => sum + chunk.byteLength, 0);
  const out = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    out.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return out;
}

function arrowEos(): Uint8Array {
  return new Uint8Array([255, 255, 255, 255, 0, 0, 0, 0]);
}

function postgresNumericTypmod(precision: number, scale: number): number {
  return ((precision << 16) | scale) + 4;
}

function loadApacheArrowForTest(): {
  tableFromIPC(bytes: Uint8Array): {
    numRows: number;
    schema: { fields: { name: string; type?: unknown }[] };
    getChild(name: string): { get(index: number): { valueOf(scale?: number): number } } | null;
  };
} {
  const require = createRequire(import.meta.url);
  return require("apache-arrow") as {
    tableFromIPC(bytes: Uint8Array): {
      numRows: number;
      schema: { fields: { name: string; type?: unknown }[] };
      getChild(name: string): { get(index: number): { valueOf(scale?: number): number } } | null;
    };
  };
}
