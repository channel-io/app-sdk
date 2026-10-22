import { z } from "zod";
import { OAuthStepDisplaySchema } from "./oauth.js";
import { HTTPSRedirectOriginSchema, HTTPSRedirectURLSchema } from "../schemas/redirect.js";
import type {
  HookConfig as ProtoHookConfig,
  HookAppPersonInvokedInput as ProtoAppPersonInvokedHookInput,
  HookAppPersonInvokedResult as ProtoAppPersonInvokedHookResult,
  HookGetHooksOutput as ProtoGetHooksOutput,
  HookTeamChatMessageCreatedInput as ProtoTeamChatMessageCreatedHookInput,
  HookTeamChatMessageCreatedResult as ProtoTeamChatMessageCreatedHookResult,
  HookUserChatOpenedInput as ProtoUserChatOpenedHookInput,
  HookUserChatOpenedResult as ProtoUserChatOpenedHookResult,
  HookWebhookConfig as ProtoWebhookConfig,
  HookWebhookResponse as ProtoWebhookResponse,
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
  "appPerson.invoked",
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
const nonNegativeInt64Pattern = /^(0|[1-9]\d{0,18})$/;
const NonNegativeInt64StringSchema = z
  .string()
  .regex(nonNegativeInt64Pattern)
  .refine(
    (value) => nonNegativeInt64Pattern.test(value) && BigInt(value) <= MAX_SIGNED_INT64,
    "value exceeds signed int64"
  );

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
    version: NonNegativeInt64StringSchema,
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

const AppPersonInvokedIdentifierSchema = z.string().min(1).max(255);

/** Explicit single-app invocation. The initiating manager is separate from credential scope. */
export const AppPersonInvokedHookInputSchema = z
  .object({
    type: z.literal("appPerson.invoked"),
    version: z.literal(1),
    eventId: AppPersonInvokedIdentifierSchema,
    invocationId: AppPersonInvokedIdentifierSchema,
    requestId: AppPersonInvokedIdentifierSchema,
    sourceEventId: AppPersonInvokedIdentifierSchema,
    channelId: AppPersonInvokedIdentifierSchema,
    chatType: z.enum(["group", "directChat", "userChat"]),
    chatId: AppPersonInvokedIdentifierSchema,
    threadId: z.preprocess(
      (value) => (value === null ? undefined : value),
      AppPersonInvokedIdentifierSchema.optional()
    ),
    sourceMessageId: AppPersonInvokedIdentifierSchema,
    sourceContentRevision: NonNegativeInt64StringSchema.refine((value) => value !== "0", {
      message: "sourceContentRevision must be positive",
    }),
    requestedAt: z.string().datetime({ offset: true }),
    appId: AppPersonInvokedIdentifierSchema,
    appPersonId: AppPersonInvokedIdentifierSchema,
    installationId: AppPersonInvokedIdentifierSchema,
    invokingManagerId: AppPersonInvokedIdentifierSchema,
    credentialScope: z.enum(["channel", "manager"]),
    prompt: z.string(),
  })
  .strict()
  .superRefine((input, ctx) => {
    if (input.chatType !== "group" && input.threadId !== undefined) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["threadId"],
        message: "Only Group invocations support threads",
      });
    }
    const expectedScope = input.chatType === "directChat" ? "manager" : "channel";
    if (input.credentialScope !== expectedScope) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["credentialScope"],
        message: "Group and userChat use channel credentials; directChat uses manager credentials",
      });
    }
  });

export type AppPersonInvokedHookInput = ProtoBacked<
  z.infer<typeof AppPersonInvokedHookInputSchema>,
  ProtoAppPersonInvokedHookInput
>;

export const AppPersonInvokedHookResultSchema = z
  .object({
    hookHandlingResult: z.enum(["succeeded", "skipped", "failed"]),
    terminal: z.literal(true),
  })
  .strict();

export type AppPersonInvokedHookResult = ProtoBacked<
  z.infer<typeof AppPersonInvokedHookResultSchema>,
  ProtoAppPersonInvokedHookResult
>;

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

const mimeToken = "[!#$%&'*+.^_`|~0-9A-Za-z-]+";
const mimeParameter = `(${mimeToken})[ \\t]*=[ \\t]*(${mimeToken}|"(?:[^"\\\\\\r\\n\\x00-\\x08\\x0b\\x0c\\x0e-\\x1f\\x7f]|\\\\[\\t -~])*")`;
const webhookResponseContentType = new RegExp(
  `^[ \\t]*${mimeToken}/${mimeToken}(?:[ \\t]*;[ \\t]*${mimeParameter})*[ \\t]*;?[ \\t]*$`
);

const WebhookResponseBaseSchema = z
  .object({
    statusCode: z.number().int().min(200).max(299),
    contentType: z
      .string()
      .regex(webhookResponseContentType)
      .refine((value) => !/[\r\n\uD800-\uDFFF]/u.test(value)),
    body: z
      .string()
      .max(64 * 1024)
      .refine((value) => !/[\uD800-\uDFFF]/u.test(value), "Body must be well-formed Unicode")
      .optional(),
  })
  .strict();

/** Fixed acknowledgement after outbox persistence; it does not report app completion. */
export const WebhookResponseSchema = z
  .union([
    WebhookResponseBaseSchema.extend({
      statusCode: z.union([z.number().int().min(200).max(203), z.number().int().min(206).max(299)]),
    }),
    WebhookResponseBaseSchema.extend({
      statusCode: z.union([z.literal(204), z.literal(205)]),
      body: z.literal("").optional(),
    }),
  ])
  .superRefine((response, ctx) => {
    const parameters = new Map<string, string>();
    for (const [, attribute = "", raw = ""] of response.contentType.matchAll(
      new RegExp(`;[ \\t]*${mimeParameter}`, "g")
    )) {
      const name = attribute.toLowerCase();
      const value = raw.startsWith('"')
        ? raw.slice(1, -1).replace(/\\([()<>@,;:\\"/[\]?=])/g, "$1")
        : raw;
      if (parameters.has(name) && parameters.get(name) !== value) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["contentType"],
          message: "Conflicting MIME parameters",
        });
      }
      parameters.set(name, value);
    }
    if (new TextEncoder().encode(response.body ?? "").length > 64 * 1024) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["body"],
        message: "Body must be at most 64 KiB",
      });
    }
  });

export type WebhookResponse = ProtoBacked<
  z.infer<typeof WebhookResponseSchema>,
  ProtoWebhookResponse
>;

const AppWebhookConfigSchema = z
  .object({
    endpointToken: WebhookEndpointTokenSchema,
    response: WebhookResponseSchema.optional(),
    executionScope: z.literal("app").optional(),
  })
  .strict();

const ManagerWebhookConfigSchema = z
  .object({
    executionScope: z.literal("manager"),
    response: WebhookResponseSchema.optional(),
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
  BaseHookConfigSchema.extend({
    type: z.literal("appPerson.invoked"),
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
