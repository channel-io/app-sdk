import { z } from "zod";
import type {
  AppNotebook as ProtoAppNotebook,
  NotebookCell as ProtoNotebookCell,
  NotebookGetNotebooksInput as ProtoGetNotebooksInput,
  NotebookGetNotebooksOutput as ProtoGetNotebooksResponse,
  NotebookLayoutColumn as ProtoNotebookLayoutColumn,
  NotebookLayoutRow as ProtoNotebookLayoutRow,
  NotebookPayload as ProtoNotebookPayload,
  NotebookTab as ProtoNotebookTab,
} from "../gen/channel/app/sdk/v1/extension.js";
import type { Context } from "../types/context.js";
import type { ExtensionDefinition } from "../types/extension.js";

type ProtoBacked<T, Proto> = T & Proto;

export const NotebookCellTypeSchema = z.enum([
  "markdown",
  "sql",
  "python",
  "input",
  "chart",
  "table",
  "single_value",
]);
export type NotebookCellType = ProtoBacked<
  z.infer<typeof NotebookCellTypeSchema>,
  ProtoNotebookCell["type"]
>;

export const NotebookInitialVisibilitySchema = z.enum(["visible", "hidden"]);
export type NotebookInitialVisibility = ProtoBacked<
  z.infer<typeof NotebookInitialVisibilitySchema>,
  ProtoAppNotebook["initialVisibility"]
>;

export const NotebookCellSchema = z.object({
  cellKey: z.string().min(1),
  type: NotebookCellTypeSchema,
  name: z.string().optional(),
  definition: z.record(z.string(), z.unknown()),
  presentation: z.record(z.string(), z.unknown()).optional(),
});
export type NotebookCell = ProtoBacked<z.infer<typeof NotebookCellSchema>, ProtoNotebookCell>;

export const NotebookLayoutColumnSchema = z.object({
  cellKey: z.string().min(1),
  colStart: z.number().int().min(0),
  colEnd: z.number().int().min(1),
});
export type NotebookLayoutColumn = ProtoBacked<
  z.infer<typeof NotebookLayoutColumnSchema>,
  ProtoNotebookLayoutColumn
>;

export const NotebookLayoutRowSchema = z.object({
  rowKey: z.string().min(1),
  position: z.number().int().min(0),
  columns: z.array(NotebookLayoutColumnSchema),
});
export type NotebookLayoutRow = ProtoBacked<
  z.infer<typeof NotebookLayoutRowSchema>,
  ProtoNotebookLayoutRow
>;

export const NotebookTabSchema = z.object({
  tabKey: z.string().min(1),
  label: z.string().min(1),
  position: z.number().int().min(0),
  layout: z.array(NotebookLayoutRowSchema),
});
export type NotebookTab = ProtoBacked<z.infer<typeof NotebookTabSchema>, ProtoNotebookTab>;

export const NotebookPayloadSchema = z.object({
  cells: z.array(NotebookCellSchema),
  tabs: z.array(NotebookTabSchema).optional(),
});
export type NotebookPayload = ProtoBacked<
  z.infer<typeof NotebookPayloadSchema>,
  ProtoNotebookPayload
>;

export const AppNotebookSchema = z.object({
  notebookKey: z.string().min(1),
  version: z.number().int().min(1),
  title: z.string().min(1),
  description: z.string().optional(),
  icon: z.string().optional(),
  initialVisibility: NotebookInitialVisibilitySchema.optional(),
  notebook: NotebookPayloadSchema,
});
export type AppNotebook = ProtoBacked<z.infer<typeof AppNotebookSchema>, ProtoAppNotebook>;

export const GetNotebooksInputSchema = z.object({});
export type GetNotebooksInput = ProtoBacked<
  z.infer<typeof GetNotebooksInputSchema>,
  ProtoGetNotebooksInput
>;

export const GetNotebooksResponseSchema = z.object({
  notebooks: z.array(AppNotebookSchema),
});
export type GetNotebooksResponse = ProtoBacked<
  z.infer<typeof GetNotebooksResponseSchema>,
  ProtoGetNotebooksResponse
>;

export interface NotebookExtensionProvider {
  getNotebooks(
    ctx: Context,
    input: GetNotebooksInput
  ): GetNotebooksResponse | Promise<GetNotebooksResponse>;
}

export function createNotebookExtensionV1(
  provider: NotebookExtensionProvider
): ExtensionDefinition {
  return {
    name: "notebook",
    systemVersion: "v1",
    groups: {
      core: {
        getNotebooks: {
          description: "Get app-managed notebook definitions from app server.",
          input: GetNotebooksInputSchema,
          output: GetNotebooksResponseSchema,
          handler: async (ctx, input) => {
            const params = GetNotebooksInputSchema.parse(input);
            return GetNotebooksResponseSchema.parse(await provider.getNotebooks(ctx, params));
          },
        },
      },
    },
  };
}
