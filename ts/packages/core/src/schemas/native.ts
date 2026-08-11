import { z } from "zod";
import type { FunctionSchema } from "../types/function.js";
import { zodToJsonSchema } from "../utils/zod-to-json-schema.js";

const NativeNonEmptyStringSchema = z.string().min(1);

export const NativeOperatorTypeSchema = z.enum([
  "OPERATOR_TYPE_UNSPECIFIED",
  "OPERATOR_TYPE_BOOLEAN",
  "OPERATOR_TYPE_DATE",
  "OPERATOR_TYPE_DATETIME",
  "OPERATOR_TYPE_LIST_OF_STRING",
  "OPERATOR_TYPE_LIST_OF_NUMBER",
  "OPERATOR_TYPE_NUMBER",
  "OPERATOR_TYPE_STRING",
  "OPERATOR_TYPE_LIST_OF_OBJECT",
]);

export const NativeAppDataTableColumnSchema = z.object({
  key: NativeNonEmptyStringSchema,
  name: NativeNonEmptyStringSchema,
  type: NativeOperatorTypeSchema,
  nullable: z.boolean().optional(),
  description: z.string().optional(),
});

export const NativeAppDataTableSchemaSchema = z.object({
  channelId: z.string().optional(),
  appId: z.string().optional(),
  tableName: NativeNonEmptyStringSchema,
  columns: z.array(NativeAppDataTableColumnSchema).min(1),
  primaryKeyColumns: z.array(NativeNonEmptyStringSchema).optional(),
});

export const NativeCreateAppDataTableParamsSchema = z.object({
  appId: NativeNonEmptyStringSchema,
  tableName: NativeNonEmptyStringSchema,
  columns: z.array(NativeAppDataTableColumnSchema).min(1),
  primaryKeyColumns: z.array(NativeNonEmptyStringSchema).optional(),
});

export const NativeCreateAppDataTableResultSchema = z.object({
  requestId: NativeNonEmptyStringSchema,
});

export const NativeCreateAppDataTableSchemaParamsSchema = z.object({
  channelId: NativeNonEmptyStringSchema,
  appId: NativeNonEmptyStringSchema,
  tableName: NativeNonEmptyStringSchema,
  columns: z.array(NativeAppDataTableColumnSchema).min(1),
  primaryKeyColumns: z.array(NativeNonEmptyStringSchema).optional(),
});

export const NativeCreateAppDataTableSchemaResultSchema = z.object({
  requestId: NativeNonEmptyStringSchema,
  schema: NativeAppDataTableSchemaSchema.optional(),
});

export const NativeGetAppDataTableSchemaParamsSchema = z.object({
  channelId: NativeNonEmptyStringSchema,
  appId: NativeNonEmptyStringSchema,
  tableName: NativeNonEmptyStringSchema,
});

export const NativeGetAppDataTableSchemaResultSchema = z.object({
  schema: NativeAppDataTableSchemaSchema.optional(),
});

export const NativeUpsertAppDataTableRowsParamsSchema = z.object({
  channelId: NativeNonEmptyStringSchema,
  appId: NativeNonEmptyStringSchema,
  tableName: NativeNonEmptyStringSchema,
  rows: z.array(z.record(z.string(), z.unknown())).min(1).max(100),
});

export const NativeUpsertAppDataTableRowsResultSchema = z.object({
  requestId: NativeNonEmptyStringSchema,
  acceptedRowCount: z.number().int().nonnegative(),
});

export const NativeGetAppNotebookVersionsParamsSchema = z.object({
  appId: NativeNonEmptyStringSchema,
});

export const NativeAppNotebookVersionSchema = z.object({
  notebookKey: NativeNonEmptyStringSchema,
  version: z.number().int().min(1),
  latestRevisionId: z.string().optional(),
  updatedAt: z.string().optional(),
});

export const NativeGetAppNotebookVersionsResultSchema = z.object({
  success: z.boolean(),
  errorMessage: z.string().optional(),
  notebooks: z.array(NativeAppNotebookVersionSchema),
});

export const NativeListActiveOAuthManagerTargetsParamsSchema = z
  .object({
    cursor: NativeNonEmptyStringSchema.optional(),
    limit: z.number().int().min(1).max(500),
  })
  .strict();

export const NativeActiveOAuthManagerTargetSchema = z
  .object({
    channelId: NativeNonEmptyStringSchema,
    managerId: NativeNonEmptyStringSchema,
  })
  .strict();

export const NativeListActiveOAuthManagerTargetsResultSchema = z
  .object({
    targets: z.array(NativeActiveOAuthManagerTargetSchema),
    nextCursor: NativeNonEmptyStringSchema.optional(),
  })
  .strict();

interface NativeFunctionSchemaDefinition {
  name: string;
  description: string;
  input: z.ZodType;
  output: z.ZodType;
}

export const nativeFunctionSchemaDefinitions = [
  {
    name: "createAppDataTable",
    description: "Create an app-owned logical data table.",
    input: NativeCreateAppDataTableParamsSchema,
    output: NativeCreateAppDataTableResultSchema,
  },
  {
    name: "createAppDataTableSchema",
    description: "Create or revise a tenant schema for an app-owned data table.",
    input: NativeCreateAppDataTableSchemaParamsSchema,
    output: NativeCreateAppDataTableSchemaResultSchema,
  },
  {
    name: "getAppDataTableSchema",
    description: "Get the latest schema for an app-owned data table.",
    input: NativeGetAppDataTableSchemaParamsSchema,
    output: NativeGetAppDataTableSchemaResultSchema,
  },
  {
    name: "upsertAppDataTableRows",
    description: "Validate and enqueue rows for asynchronous AppDataTable ingestion.",
    input: NativeUpsertAppDataTableRowsParamsSchema,
    output: NativeUpsertAppDataTableRowsResultSchema,
  },
  {
    name: "getAppNotebookVersions",
    description: "Get the latest synced app notebook versions.",
    input: NativeGetAppNotebookVersionsParamsSchema,
    output: NativeGetAppNotebookVersionsResultSchema,
  },
  {
    name: "listActiveOAuthManagerTargets",
    description: "Page active manager-scoped OAuth targets within the app token's own app scope.",
    input: NativeListActiveOAuthManagerTargetsParamsSchema,
    output: NativeListActiveOAuthManagerTargetsResultSchema,
  },
] satisfies NativeFunctionSchemaDefinition[];

export function getNativeFunctionSchemas(): FunctionSchema[] {
  return nativeFunctionSchemaDefinitions.map((definition) => ({
    name: definition.name,
    description: definition.description,
    inputSchema: zodToJsonSchema(definition.input),
    outputSchema: zodToJsonSchema(definition.output),
  }));
}
