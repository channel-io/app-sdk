import { describe, expect, expectTypeOf, it } from "vitest";
import {
  NativeCreateAppDataTableParamsSchema,
  NativeListActiveOAuthManagerTargetsParamsSchema,
  NativeListActiveOAuthManagerTargetsResultSchema,
  NativeUpsertAppDataTableRowsParamsSchema,
  getNativeFunctionSchemas,
  nativeFunctionSchemaDefinitions,
} from "../../schemas/native.js";
import type {
  NativeFunctionParams,
  NativeFunctionResult,
  NativeListActiveOAuthManagerTargetsParams,
  NativeListActiveOAuthManagerTargetsResult,
} from "../../types/native.js";

describe("native function schemas", () => {
  it("exposes AppDataTable native function schemas", () => {
    const names = getNativeFunctionSchemas().map((schema) => schema.name);

    expect(names).toEqual([
      "createAppDataTable",
      "createAppDataTableSchema",
      "getAppDataTableSchema",
      "upsertAppDataTableRows",
      "getAppNotebookVersions",
      "listActiveOAuthManagerTargets",
    ]);
    expect(nativeFunctionSchemaDefinitions).toHaveLength(6);
  });

  it("validates createAppDataTable input", () => {
    expect(() =>
      NativeCreateAppDataTableParamsSchema.parse({
        appId: "app-1",
        tableName: "orders",
        columns: [{ key: "id", name: "ID", type: "OPERATOR_TYPE_STRING" }],
        primaryKeyColumns: ["id"],
      })
    ).not.toThrow();

    expect(() =>
      NativeCreateAppDataTableParamsSchema.parse({
        appId: "app-1",
        tableName: "orders",
        columns: [],
      })
    ).toThrow();
  });

  it("requires bounded row batches for upsertAppDataTableRows", () => {
    expect(() =>
      NativeUpsertAppDataTableRowsParamsSchema.parse({
        channelId: "ch-1",
        appId: "app-1",
        tableName: "orders",
        rows: [{ id: "order-1" }],
      })
    ).not.toThrow();

    expect(() =>
      NativeUpsertAppDataTableRowsParamsSchema.parse({
        channelId: "ch-1",
        appId: "app-1",
        tableName: "orders",
        rows: [],
      })
    ).toThrow();

    expect(() =>
      NativeUpsertAppDataTableRowsParamsSchema.parse({
        channelId: "ch-1",
        appId: "app-1",
        tableName: "orders",
        rows: Array.from({ length: 101 }, (_, index) => ({ id: `order-${index}` })),
      })
    ).toThrow();
  });

  it("validates paginated active OAuth manager target discovery input", () => {
    expect(() => NativeListActiveOAuthManagerTargetsParamsSchema.parse({ limit: 1 })).not.toThrow();
    expect(() =>
      NativeListActiveOAuthManagerTargetsParamsSchema.parse({ limit: 500, cursor: "cursor" })
    ).not.toThrow();

    for (const input of [
      { limit: 0 },
      { limit: 501 },
      { limit: 1.5 },
      { limit: 1, cursor: "" },
      { limit: 1, appId: "app-1" },
    ]) {
      expect(() => NativeListActiveOAuthManagerTargetsParamsSchema.parse(input)).toThrow();
    }
  });

  it("validates strict active OAuth manager target discovery output", () => {
    expect(() =>
      NativeListActiveOAuthManagerTargetsResultSchema.parse({
        targets: [{ channelId: "channel-1", managerId: "manager-1" }],
        nextCursor: "cursor-2",
      })
    ).not.toThrow();
    expect(() =>
      NativeListActiveOAuthManagerTargetsResultSchema.parse({
        targets: [{ channelId: "channel-1", managerId: "manager-1" }],
      })
    ).not.toThrow();

    for (const output of [
      { targets: [{ channelId: "", managerId: "manager-1" }] },
      { targets: [{ channelId: "channel-1", managerId: "" }] },
      { targets: [], nextCursor: "" },
      { targets: [{ channelId: "channel-1", managerId: "manager-1", token: "secret" }] },
      { targets: [], credential: "secret" },
      { targets: [], provider: "oauth" },
    ]) {
      expect(() => NativeListActiveOAuthManagerTargetsResultSchema.parse(output)).toThrow();
    }
  });

  it("maps active OAuth manager target discovery method types", () => {
    type Params = NativeFunctionParams<"listActiveOAuthManagerTargets">;
    type Result = NativeFunctionResult<"listActiveOAuthManagerTargets">;

    expectTypeOf<Params>().toEqualTypeOf<NativeListActiveOAuthManagerTargetsParams>();
    expectTypeOf<Result>().toEqualTypeOf<NativeListActiveOAuthManagerTargetsResult>();
  });
});
