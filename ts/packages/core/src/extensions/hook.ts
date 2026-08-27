import { z } from "zod";
import type {
  HookConfig as ProtoHookConfig,
  HookGetHooksOutput as ProtoGetHooksOutput,
  HookUserChatOpenedInput as ProtoUserChatOpenedHookInput,
  HookUserChatOpenedResult as ProtoUserChatOpenedHookResult,
  HookWebhookConfig as ProtoWebhookConfig,
} from "../gen/channel/app/sdk/v1/extension.js";

type ProtoBacked<T extends Proto, Proto> = T;

/**
 * Hook type returned from extension.hook.metadata.getHooks.
 */
export const HookTypeSchema = z.enum([
  "app.installed",
  "app.uninstalled",
  "command.toggle",
  "config.saved",
  "config.deleted",
  "widget.installed",
  "widget.uninstalled",
  "webhook.received",
  "oauth.connected",
  "oauth.disconnected",
  "userChat.opened",
]);

export type HookType = z.infer<typeof HookTypeSchema>;

const HookSystemVersionSchema = z
  .string()
  .min(1)
  .max(50)
  .regex(/^[A-Za-z0-9._-]+$/);

const HookActionFunctionNameSchema = z
  .string()
  .min(1)
  .max(255)
  .regex(/^[a-zA-Z_][a-zA-Z0-9._]*$/);

const HookTargetIdSchema = z.string().min(1).max(255);

const WebhookTargetIdSchema = z
  .string()
  .min(1)
  .max(64)
  .regex(/^[A-Za-z0-9][A-Za-z0-9._-]*$/);

const WebhookEndpointTokenSchema = z
  .string()
  .min(32)
  .max(128)
  .regex(/^[A-Za-z0-9_-]+$/);

export const WebhookExecutionScopeSchema = z.enum(["app", "manager"]);

export const UserChatOpenKindSchema = z.enum(["first_open", "reopen"]);

export type UserChatOpenKind = ProtoBacked<
  z.infer<typeof UserChatOpenKindSchema>,
  ProtoUserChatOpenedHookInput["openKind"]
>;

export const UserChatOpenedActorKindSchema = z.enum(["customer", "manager", "auto"]);

export type UserChatOpenedActorKind = ProtoBacked<
  z.infer<typeof UserChatOpenedActorKindSchema>,
  ProtoUserChatOpenedHookInput["actorKind"]
>;

const UserChatOpenedIdentifierSchema = z.string().min(1).max(255);
const MAX_SIGNED_INT64 = 9_223_372_036_854_775_807n;
const UserChatOpenedVersionSchema = z
  .string()
  .regex(/^(0|[1-9]\d*)$/)
  .refine((value) => BigInt(value) <= MAX_SIGNED_INT64, "version exceeds signed int64");

export const UserChatOpenedHookInputSchema = z
  .object({
    eventId: UserChatOpenedIdentifierSchema,
    channelId: UserChatOpenedIdentifierSchema,
    userChatId: UserChatOpenedIdentifierSchema,
    state: z.literal("opened"),
    previousState: UserChatOpenedIdentifierSchema,
    openKind: UserChatOpenKindSchema,
    actorKind: UserChatOpenedActorKindSchema,
    triggerMessageId: UserChatOpenedIdentifierSchema.optional(),
    occurredAt: z.string().datetime({ offset: true }),
    version: UserChatOpenedVersionSchema,
  })
  .strict();

export type UserChatOpenedHookInput = ProtoBacked<
  z.infer<typeof UserChatOpenedHookInputSchema>,
  ProtoUserChatOpenedHookInput
>;

export const UserChatOpenedHookResultSchema = z.discriminatedUnion("hookHandlingResult", [
  z.object({ hookHandlingResult: z.literal("accepted"), terminal: z.literal(false) }).strict(),
  z.object({ hookHandlingResult: z.literal("retrying"), terminal: z.literal(false) }).strict(),
  z.object({ hookHandlingResult: z.literal("succeeded"), terminal: z.literal(true) }).strict(),
  z.object({ hookHandlingResult: z.literal("skipped_reopen"), terminal: z.literal(true) }).strict(),
  z
    .object({
      hookHandlingResult: z.literal("skipped_ineligible_actor"),
      terminal: z.literal(true),
    })
    .strict(),
  z
    .object({ hookHandlingResult: z.literal("skipped_disabled"), terminal: z.literal(true) })
    .strict(),
  z
    .object({
      hookHandlingResult: z.literal("failed_retry_exhausted"),
      terminal: z.literal(true),
    })
    .strict(),
  z.object({ hookHandlingResult: z.literal("unknown"), terminal: z.literal(true) }).strict(),
]);

export type UserChatOpenedHookResult = ProtoBacked<
  z.infer<typeof UserChatOpenedHookResultSchema>,
  ProtoUserChatOpenedHookResult
>;

const AppWebhookConfigSchema = z
  .object({
    endpointToken: WebhookEndpointTokenSchema,
    executionScope: z.literal("app").optional(),
  })
  .strict();

const ManagerWebhookConfigSchema = z
  .object({
    executionScope: z.literal("manager"),
  })
  .strict();

export const WebhookConfigSchema = z.union([AppWebhookConfigSchema, ManagerWebhookConfigSchema]);

export type WebhookConfig = ProtoBacked<z.infer<typeof WebhookConfigSchema>, ProtoWebhookConfig>;

const BaseHookConfigSchema = z.object({
  actionFunctionName: HookActionFunctionNameSchema,
  systemVersion: HookSystemVersionSchema.optional(),
});

/**
 * Hook metadata schema returned from extension.hook.metadata.getHooks.
 *
 * App, command, and config hooks do not require a target identifier.
 * Widget hooks must include a targetId that matches the widget name.
 * Public webhook hooks require a targetId. App-scoped hooks require a
 * high-entropy endpoint token; manager-scoped hooks use an AppStore-issued binding URL.
 */
export const HookConfigSchema = z.discriminatedUnion("type", [
  BaseHookConfigSchema.extend({
    type: z.literal("app.installed"),
  }).strict(),
  BaseHookConfigSchema.extend({
    type: z.literal("app.uninstalled"),
  }).strict(),
  BaseHookConfigSchema.extend({
    type: z.literal("command.toggle"),
  }).strict(),
  BaseHookConfigSchema.extend({
    type: z.literal("config.saved"),
  }).strict(),
  BaseHookConfigSchema.extend({
    type: z.literal("config.deleted"),
  }).strict(),
  BaseHookConfigSchema.extend({
    type: z.literal("widget.installed"),
    targetId: HookTargetIdSchema,
  }).strict(),
  BaseHookConfigSchema.extend({
    type: z.literal("widget.uninstalled"),
    targetId: HookTargetIdSchema,
  }).strict(),
  BaseHookConfigSchema.extend({
    type: z.literal("webhook.received"),
    targetId: WebhookTargetIdSchema,
    webhook: WebhookConfigSchema,
  }).strict(),
  BaseHookConfigSchema.extend({
    type: z.literal("oauth.connected"),
  }).strict(),
  BaseHookConfigSchema.extend({
    type: z.literal("oauth.disconnected"),
  }).strict(),
  BaseHookConfigSchema.extend({
    type: z.literal("userChat.opened"),
  }).strict(),
]);

export type HookConfig = ProtoBacked<z.infer<typeof HookConfigSchema>, ProtoHookConfig>;

/**
 * Metadata response schema for hook registration.
 */
export const GetHooksOutputSchema = z.object({
  hooks: z.array(HookConfigSchema),
});

export type GetHooksOutput = ProtoBacked<z.infer<typeof GetHooksOutputSchema>, ProtoGetHooksOutput>;
