import { z } from "zod";
import type {
  CommandChoice as ProtoCommandChoice,
  CommandConfig as ProtoCommandConfig,
  CommandGetCommandsOutput as ProtoGetCommandsOutput,
  CommandNameDescI18n as ProtoCommandNameDescI18n,
  CommandNameI18n as ProtoCommandNameI18n,
  CommandParamDefI18n as ProtoCommandParamDefI18n,
  CommandParamDefinition as ProtoCommandParamDefinition,
  CommandResult as ProtoCommandResult,
} from "../gen/channel/app/sdk/v1/extension.js";

type ProtoBacked<T, Proto> = T & Proto;

/**
 * Command scope
 */
export const CommandScopeSchema = z.enum(["front", "desk"]);
export type CommandScope = z.infer<typeof CommandScopeSchema>;

/**
 * ALF mode for commands
 */
export const CommandAlfModeSchema = z.enum(["disable", "recommend"]);
export type CommandAlfMode = z.infer<typeof CommandAlfModeSchema>;

/**
 * Parameter type for command inputs
 */
export const CommandParamTypeSchema = z.enum(["string", "float", "int", "bool"]);
export type CommandParamType = z.infer<typeof CommandParamTypeSchema>;

/**
 * I18n name schema
 */
export const CommandNameI18nSchema = z.object({
  name: z.string().min(1).max(30),
});
export type CommandNameI18n = ProtoBacked<
  z.infer<typeof CommandNameI18nSchema>,
  ProtoCommandNameI18n
>;

/**
 * I18n name and description schema
 */
export const CommandNameDescI18nSchema = z.object({
  name: z.string().min(1).max(30),
  description: z.string().max(100),
});
export type CommandNameDescI18n = ProtoBacked<
  z.infer<typeof CommandNameDescI18nSchema>,
  ProtoCommandNameDescI18n
>;

/**
 * I18n schema for parameter definitions
 */
export const CommandParamDefI18nSchema = z.object({
  name: z.string().min(1).max(20),
  description: z.string().max(50),
});
export type CommandParamDefI18n = ProtoBacked<
  z.infer<typeof CommandParamDefI18nSchema>,
  ProtoCommandParamDefI18n
>;

/**
 * Choice option schema for command parameters
 */
export const CommandChoiceSchema = z.object({
  name: z.string(),
  value: z.union([z.string(), z.number(), z.boolean()]),
  nameDescI18nMap: z.record(z.string(), CommandNameDescI18nSchema).optional(),
});
export type CommandChoice = ProtoBacked<z.infer<typeof CommandChoiceSchema>, ProtoCommandChoice>;

/**
 * Parameter definition schema for command metadata
 */
export const CommandParamDefinitionSchema = z.object({
  name: z.string().min(1).max(20),
  type: CommandParamTypeSchema,
  required: z.boolean(),
  description: z.string().max(50).optional(),
  choices: z.array(CommandChoiceSchema).max(10).optional(),
  nameDescI18nMap: z.record(z.string(), CommandParamDefI18nSchema).optional(),
  autoComplete: z.boolean().optional(),
  alfDescription: z.string().max(1500).optional(),
});
export type CommandParamDefinition = ProtoBacked<
  z.infer<typeof CommandParamDefinitionSchema>,
  ProtoCommandParamDefinition
>;

/**
 * Command metadata schema returned from extension.command.metadata.getCommands
 */
export const CommandConfigSchema = z.object({
  name: z.string().min(1).max(30),
  scope: CommandScopeSchema,
  buttonName: z.string().min(1).max(30).optional(),
  buttonNameI18nMap: z.record(z.string(), CommandNameI18nSchema).optional(),
  description: z.string().max(100).optional(),
  nameDescI18nMap: z.record(z.string(), CommandNameDescI18nSchema).optional(),
  actionFunctionName: z.string().min(1),
  autoCompleteFunctionName: z.string().min(1).optional(),
  systemVersion: z.string().optional(),
  alfMode: CommandAlfModeSchema,
  alfDescription: z.string().max(1500).optional(),
  paramDefinitions: z.array(CommandParamDefinitionSchema).max(10).optional(),
  enabledByDefault: z.boolean().optional(),
});
export type CommandConfig = ProtoBacked<z.infer<typeof CommandConfigSchema>, ProtoCommandConfig>;

/**
 * Metadata response schema for command registration
 */
export const GetCommandsOutputSchema = z.object({
  commands: z.array(CommandConfigSchema).max(30),
});
export type GetCommandsOutput = ProtoBacked<
  z.infer<typeof GetCommandsOutputSchema>,
  ProtoGetCommandsOutput
>;

/**
 * Command result schema — matches Channel App platform Action format.
 *
 * `type` is a free-form string (no enum constraint), just like
 * app-store's `ActionType string` and desk's type guards.
 */
export const CommandResultSchema = z
  .object({
    type: z.string().min(1),
    attributes: z.record(z.string(), z.unknown()).optional(),
  })
  .strict();

export type CommandResult = ProtoBacked<z.infer<typeof CommandResultSchema>, ProtoCommandResult>;
