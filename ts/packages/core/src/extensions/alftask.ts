import { z } from "zod";
import type {
  AlfTaskGetTasksInput as ProtoGetAlfTasksInput,
  AlfTaskGetTasksOutput as ProtoGetAlfTasksResponse,
  AlfTaskMemoryDefinition as ProtoMemoryDefinition,
  AlfTaskPredefinedTask as ProtoPredefinedTask,
  AlfTaskWorkflowNode as ProtoWorkflowNode,
} from "../gen/channel/app/sdk/v1/extension.js";
import type { Context } from "../types/context.js";
import type { ExtensionDefinition } from "../types/extension.js";

type ProtoBacked<T, Proto> = T & Proto;

/**
 * Memory definition for ALF task
 */
export const MemoryDefinitionSchema = z.object({
  name: z.string(),
  type: z.enum(["string", "number", "boolean", "object", "array"]),
  description: z.string().optional(),
});

export type MemoryDefinition = ProtoBacked<
  z.infer<typeof MemoryDefinitionSchema>,
  ProtoMemoryDefinition
>;

/**
 * Workflow node for ALF task
 */
export const WorkflowNodeSchema = z.object({
  id: z.string(),
  type: z.string(),
  config: z.record(z.string(), z.unknown()).optional(),
  next: z.string().optional(),
});

export type WorkflowNode = ProtoBacked<z.infer<typeof WorkflowNodeSchema>, ProtoWorkflowNode>;

/**
 * Predefined task schema
 */
export const PredefinedTaskSchema = z.object({
  /**
   * Task version (developer-specified, e.g., "v1.0.0", "v1.1.0")
   * Used for change detection
   */
  version: z.string(),
  /**
   * Task name
   */
  name: z.string(),
  /**
   * Trigger condition
   */
  trigger: z.string(),
  /**
   * Memory schema definitions
   */
  memorySchema: z.array(MemoryDefinitionSchema),
  /**
   * Workflow nodes
   */
  nodes: z.array(WorkflowNodeSchema),
  /**
   * Start node ID
   */
  startNodeId: z.string(),
});

export type PredefinedTask = ProtoBacked<z.infer<typeof PredefinedTaskSchema>, ProtoPredefinedTask>;

/**
 * GetAlfTasks input schema
 */
export const GetAlfTasksInputSchema = z.object({
  version: z.string().optional(),
});

export type GetAlfTasksInput = ProtoBacked<
  z.infer<typeof GetAlfTasksInputSchema>,
  ProtoGetAlfTasksInput
>;

/**
 * GetAlfTasks response schema
 */
export const GetAlfTasksResponseSchema = z.object({
  predefinedTasks: z.array(PredefinedTaskSchema),
});

export type GetAlfTasksResponse = ProtoBacked<
  z.infer<typeof GetAlfTasksResponseSchema>,
  ProtoGetAlfTasksResponse
>;

export interface AlfTaskExtensionProvider {
  getAlfTasks(
    ctx: Context,
    input: GetAlfTasksInput
  ): GetAlfTasksResponse | Promise<GetAlfTasksResponse>;
}

export function createAlfTaskExtensionV1(provider: AlfTaskExtensionProvider): ExtensionDefinition {
  return {
    name: "alfTask",
    systemVersion: "v1",
    groups: {
      alftask: {
        getTasks: {
          description: "Get predefined ALF task definitions from app server.",
          input: GetAlfTasksInputSchema,
          output: GetAlfTasksResponseSchema,
          handler: async (ctx, input) => {
            const params = GetAlfTasksInputSchema.parse(input);
            return GetAlfTasksResponseSchema.parse(await provider.getAlfTasks(ctx, params));
          },
        },
      },
    },
  };
}
