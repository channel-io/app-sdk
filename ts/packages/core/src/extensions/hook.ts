import { z } from "zod";
import { OAuthStepDisplaySchema } from "./oauth.js";
import { HTTPSRedirectOriginSchema, HTTPSRedirectURLSchema } from "../schemas/redirect.js";
import type {
  HookConfig as ProtoHookConfig,
  HookGetHooksOutput as ProtoGetHooksOutput,
  HookTeamChatMessageCreatedInput as ProtoTeamChatMessageCreatedHookInput,
  HookTeamChatMessageCreatedResult as ProtoTeamChatMessageCreatedHookResult,
  HookUserChatOpenedInput as ProtoUserChatOpenedHookInput,
  HookUserChatOpenedResult as ProtoUserChatOpenedHookResult,
  HookWebhookConfig as ProtoWebhookConfig,
  OAuthFlowHookInput as ProtoOAuthFlowHookInput,
  OAuthFlowHookResult as ProtoOAuthFlowHookResult,
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
  "oauth.beforeAuthorization",
  "oauth.afterAuthorization",
  "userChat.opened",
  "teamChat.messageCreated",
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

/** Opaque flow reference and server-owned resume URL. Neither grants manager authority. */
export const OAuthFlowHookInputSchema = z
  .object({
    flowId: z.string().min(1).max(255),
    resumeUrl: HTTPSRedirectURLSchema,
    expiresAt: z.string().datetime({ offset: true }),
  })
  .strict();

export type OAuthFlowHookInput = ProtoBacked<
  z.infer<typeof OAuthFlowHookInputSchema>,
  ProtoOAuthFlowHookInput
>;

/** A redirect must also match the hook's registered redirectOrigins on the platform. */
export const OAuthFlowHookResultSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("continue"), detail: z.string().max(200).optional() }).strict(),
  z
    .object({
      type: z.literal("redirect"),
      url: HTTPSRedirectURLSchema,
      detail: z.string().max(200).optional(),
    })
    .strict(),
]);

export type OAuthFlowHookResult = ProtoBacked<
  z.infer<typeof OAuthFlowHookResultSchema>,
  ProtoOAuthFlowHookResult
>;

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

const TeamChatMessageCreatedIdentifierSchema = z.string().min(1).max(255);

const TeamChatMessageCreatedSnapshotSchema = z.record(z.string(), z.unknown());

export const TeamChatMessageCreatedHookInputSchema = z
  .object({
    eventId: TeamChatMessageCreatedIdentifierSchema,
    channelId: TeamChatMessageCreatedIdentifierSchema,
    groupId: TeamChatMessageCreatedIdentifierSchema,
    messageId: TeamChatMessageCreatedIdentifierSchema,
    occurredAt: z.string().datetime({ offset: true }),
    sourceAppId: TeamChatMessageCreatedIdentifierSchema.optional(),
    snapshot: TeamChatMessageCreatedSnapshotSchema,
  })
  .strict();

export type TeamChatMessageCreatedHookInput = ProtoBacked<
  z.infer<typeof TeamChatMessageCreatedHookInputSchema>,
  ProtoTeamChatMessageCreatedHookInput
>;

export const TeamChatMessageCreatedHookResultSchema = z.discriminatedUnion("hookHandlingResult", [
  z.object({ hookHandlingResult: z.literal("succeeded"), terminal: z.literal(true) }).strict(),
  z
    .object({ hookHandlingResult: z.literal("skipped_source_app"), terminal: z.literal(true) })
    .strict(),
  z
    .object({ hookHandlingResult: z.literal("skipped_unlinked"), terminal: z.literal(true) })
    .strict(),
  z
    .object({
      hookHandlingResult: z.literal("skipped_ineligible_writer"),
      terminal: z.literal(true),
    })
    .strict(),
  z.object({ hookHandlingResult: z.literal("skipped_empty"), terminal: z.literal(true) }).strict(),
  z
    .object({
      hookHandlingResult: z.literal("skipped_oauth_unavailable"),
      terminal: z.literal(true),
    })
    .strict(),
  z
    .object({
      hookHandlingResult: z.literal("skipped_organization_mismatch"),
      terminal: z.literal(true),
    })
    .strict(),
  z.object({ hookHandlingResult: z.literal("unknown"), terminal: z.literal(true) }).strict(),
]);

export type TeamChatMessageCreatedHookResult = ProtoBacked<
  z.infer<typeof TeamChatMessageCreatedHookResultSchema>,
  ProtoTeamChatMessageCreatedHookResult
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
    authScope: z.enum(["channel", "manager"]).optional(),
  }).strict(),
  BaseHookConfigSchema.extend({
    type: z.literal("oauth.disconnected"),
    authScope: z.enum(["channel", "manager"]).optional(),
  }).strict(),
  BaseHookConfigSchema.extend({
    type: z.literal("oauth.beforeAuthorization"),
    authScope: z.enum(["channel", "manager"]).optional(),
    redirectOrigins: z.array(HTTPSRedirectOriginSchema).default([]),
    display: OAuthStepDisplaySchema.optional(),
  }).strict(),
  BaseHookConfigSchema.extend({
    type: z.literal("oauth.afterAuthorization"),
    authScope: z.enum(["channel", "manager"]).optional(),
    redirectOrigins: z.array(HTTPSRedirectOriginSchema).default([]),
    display: OAuthStepDisplaySchema.optional(),
  }).strict(),
  BaseHookConfigSchema.extend({
    type: z.literal("userChat.opened"),
  }).strict(),
  BaseHookConfigSchema.extend({
    type: z.literal("teamChat.messageCreated"),
  }).strict(),
]);

export type HookConfig = ProtoBacked<z.infer<typeof HookConfigSchema>, ProtoHookConfig>;

/**
 * Metadata response schema for hook registration.
 */
export const GetHooksOutputSchema = z.object({
  hooks: z.array(HookConfigSchema).superRefine((hooks, ctx) => {
    const seen = new Set<string>();
    hooks.forEach((hook, index) => {
      if (
        hook.type !== "oauth.beforeAuthorization" &&
        hook.type !== "oauth.afterAuthorization" &&
        hook.type !== "oauth.connected" &&
        hook.type !== "oauth.disconnected"
      ) {
        return;
      }
      const key = `${hook.type}:${hook.authScope ?? ""}`;
      if (seen.has(key)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: [index],
          message: "Duplicate OAuth hook type and authScope",
        });
      }
      seen.add(key);
    });
  }),
});

export type GetHooksOutput = ProtoBacked<z.infer<typeof GetHooksOutputSchema>, ProtoGetHooksOutput>;
