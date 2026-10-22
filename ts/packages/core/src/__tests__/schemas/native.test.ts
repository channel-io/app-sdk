import { describe, expect, expectTypeOf, it } from "vitest";
import {
  NativeReplyToAppPersonInvocationParamsSchema,
  NativeReplyToAppPersonInvocationResultSchema,
  NativeCreateAppDataTableParamsSchema,
  NativeGetOAuthFlowParamsSchema,
  NativeResumeOAuthFlowParamsSchema,
  NativeCancelOAuthFlowParamsSchema,
  NativeOAuthFlowResultSchema,
  NativeListActiveOAuthManagerTargetsParamsSchema,
  NativeListActiveOAuthManagerTargetsResultSchema,
  NativeUpsertAppDataTableRowsParamsSchema,
  getNativeFunctionSchemas,
  nativeFunctionSchemaDefinitions,
} from "../../schemas/native.js";
import type {
  NativeFunctionParams,
  NativeGetOAuthFlowParams,
  NativeResumeOAuthFlowParams,
  NativeCancelOAuthFlowParams,
  NativeOAuthFlowResult,
  NativeFunctionResult,
  NativeListActiveOAuthManagerTargetsParams,
  NativeListActiveOAuthManagerTargetsResult,
} from "../../types/native.js";

describe("native function schemas", () => {
  it("exposes AppDataTable native function schemas", () => {
    const names = getNativeFunctionSchemas().map((schema) => schema.name);

    expect(names).toEqual([
      "getOAuthFlow",
      "resumeOAuthFlow",
      "cancelOAuthFlow",
      "createAppDataTable",
      "createAppDataTableSchema",
      "getAppDataTableSchema",
      "upsertAppDataTableRows",
      "getAppNotebookVersions",
      "listActiveOAuthManagerTargets",
      "replyToAppPersonInvocation",
    ]);
    expect(nativeFunctionSchemaDefinitions).toHaveLength(10);
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

describe("manager OAuth flow contracts", () => {
  it("accepts flow operations without caller-supplied identities", () => {
    for (const schema of [NativeGetOAuthFlowParamsSchema, NativeCancelOAuthFlowParamsSchema]) {
      expect(schema.parse({ flowId: "flow-1" })).toEqual({ flowId: "flow-1" });
      expect(() => schema.parse({ flowId: "flow-1", managerId: "other" })).toThrow();
    }
    expect(NativeResumeOAuthFlowParamsSchema.parse({ flowId: "flow-1" })).toEqual({
      flowId: "flow-1",
    });
    expect(
      NativeResumeOAuthFlowParamsSchema.parse({ flowId: "flow-1", resumeNonce: "nonce" })
    ).toEqual({ flowId: "flow-1", resumeNonce: "nonce" });
    expect(() =>
      NativeResumeOAuthFlowParamsSchema.parse({ flowId: "flow-1", resumeNonce: "" })
    ).toThrow();
    expect(() =>
      NativeResumeOAuthFlowParamsSchema.parse({ flowId: "flow-1", authToken: "provider-token" })
    ).toThrow();
  });

  it("keeps authorizationURL capitalization and credentials out of flow state", () => {
    const flow = {
      id: "flow-1",
      phase: "after",
      expiresAt: "2026-09-17T12:00:00Z",
      authorizationURL: "https://setup.example/consent",
      key: "resolved-organization-key",
      canResume: false,
    };
    expect(NativeOAuthFlowResultSchema.parse({ flow })).toEqual({ flow });
    expect(NativeOAuthFlowResultSchema.parse({})).toEqual({});
    expect(() =>
      NativeOAuthFlowResultSchema.parse({
        flow: { ...flow, authorizationUrl: flow.authorizationURL },
      })
    ).toThrow();
    expect(() =>
      NativeOAuthFlowResultSchema.parse({ flow: { ...flow, authToken: "provider-token" } })
    ).toThrow();
    expect(() =>
      NativeOAuthFlowResultSchema.parse({ flow: { ...flow, phase: "unknown" } })
    ).toThrow();
  });

  it("maps all flow Native methods to the proto-backed DTOs", () => {
    expectTypeOf<NativeFunctionParams<"getOAuthFlow">>().toEqualTypeOf<NativeGetOAuthFlowParams>();
    expectTypeOf<
      NativeFunctionParams<"resumeOAuthFlow">
    >().toEqualTypeOf<NativeResumeOAuthFlowParams>();
    expectTypeOf<
      NativeFunctionParams<"cancelOAuthFlow">
    >().toEqualTypeOf<NativeCancelOAuthFlowParams>();
    expectTypeOf<NativeFunctionResult<"getOAuthFlow">>().toEqualTypeOf<NativeOAuthFlowResult>();
    expectTypeOf<NativeFunctionResult<"resumeOAuthFlow">>().toEqualTypeOf<NativeOAuthFlowResult>();
    expectTypeOf<NativeFunctionResult<"cancelOAuthFlow">>().toEqualTypeOf<NativeOAuthFlowResult>();
  });
});

it("keeps source authority out of reply input and measures the server text bound in Unicode code points", () => {
  const request = { invocationId: "run", plainText: "😀".repeat(10000) };
  expect(NativeReplyToAppPersonInvocationParamsSchema.safeParse(request).success).toBe(true);
  expect(
    NativeReplyToAppPersonInvocationParamsSchema.safeParse({
      ...request,
      plainText: request.plainText + "a",
    }).success
  ).toBe(false);
  expect(
    NativeReplyToAppPersonInvocationParamsSchema.safeParse({ ...request, channelId: "foreign" })
      .success
  ).toBe(false);
  expect(
    NativeReplyToAppPersonInvocationResultSchema.parse({ status: "unknown", errorCode: "pending" })
  ).toEqual({ status: "unknown", errorCode: "pending" });
  expect(
    NativeReplyToAppPersonInvocationResultSchema.safeParse({ status: "acknowledged" }).success
  ).toBe(false);
});
