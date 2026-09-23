import type {
  IssueExecuteIssueTransitionOutput as ProtoIssueExecuteIssueTransitionOutput,
  IssueExecuteIssueTransitionInput as ProtoIssueExecuteIssueTransitionInput,
  ExternalIssue as ProtoExternalIssue,
  IssueError as ProtoIssueError,
  IssueTransition as ProtoIssueTransition,
  IssueSearchIssuesInput as ProtoIssueSearchIssuesInput,
  IssueSearchIssuesOutput as ProtoIssueSearchIssuesOutput,
  IssueGetIssueInput as ProtoIssueGetIssueInput,
  IssueGetIssueOutput as ProtoIssueGetIssueOutput,
  IssueGetIssuesInput as ProtoIssueGetIssuesInput,
  IssueGetIssuesOutput as ProtoIssueGetIssuesOutput,
  IssueGetIssueTransitionsInput as ProtoIssueGetIssueTransitionsInput,
  IssueGetIssueTransitionsOutput as ProtoIssueGetIssueTransitionsOutput,
} from "../gen/channel/app/sdk/v1/extension.js";
type ProtoBacked<T, Proto> = T & Omit<Proto, keyof T>;
import { z } from "zod";

const Text = z.string().min(1);
const Scalar = z.union([z.string(), z.number(), z.boolean()]);
const unique = <T>(values: T[]) => new Set(values).size === values.length;

export const ExternalIssueStateSchema = z.enum([
  "open",
  "unstarted",
  "started",
  "completed",
  "canceled",
]);
export const IssueProviderStateSchema = z
  .object({
    id: Text.nullish(),
    category: Text.nullish(),
    name: Text,
  })
  .strict();
export const ExternalIssueSchema = z
  .object({
    issueId: Text,
    identifier: Text,
    title: Text,
    url: Text.url(),
    state: ExternalIssueStateSchema,
    providerState: IssueProviderStateSchema,
    createdAt: z.string().datetime({ offset: true }),
    container: z.object({ id: Text, name: Text }).strict().optional(),
    description: z.string().optional(),
    updatedAt: z.string().datetime({ offset: true }).nullish(),
    closedAt: z.string().datetime({ offset: true }).nullish(),
    closedBy: z
      .object({
        name: Text,
        id: Text.optional(),
        url: Text.url().optional(),
        type: z.enum(["user", "bot"]).optional(),
      })
      .strict()
      .nullish(),
  })
  .strict();
export const IssueErrorSchema = z
  .object({
    type: z.enum([
      "invalidArgument",
      "validationFailed",
      "invalidCursor",
      "unsupported",
      "unsupportedFilter",
      "forbidden",
      "notFound",
      "connectionUnavailable",
      "rateLimited",
      "temporaryFailure",
      "conflict",
      "invalidTransition",
      "outcomeUnknown",
    ]),
    message: Text,
    retryAfterMs: z.number().int().nonnegative().optional(),
  })
  .strict();
export const IssueTransitionInputSchema = z
  .object({
    type: z.literal("object"),
    properties: z.record(
      z
        .object({
          type: z.enum(["string", "number", "integer", "boolean"]),
          title: z.string().optional(),
          description: z.string().optional(),
          enum: z.array(Scalar).min(1).refine(unique).optional(),
        })
        .strict()
    ),
    required: z.array(Text).refine(unique).optional(),
    additionalProperties: z.literal(false),
  })
  .strict();
const Transition = z.object({
  id: Text,
  name: Text,
  targetState: ExternalIssueStateSchema,
  targetProviderState: IssueProviderStateSchema.optional(),
  inputSchema: IssueTransitionInputSchema.optional(),
  reason: Text.optional(),
  externalUrl: Text.url().optional(),
});
export const IssueTransitionSchema = z.discriminatedUnion("availability", [
  Transition.extend({
    availability: z.literal("available"),
    inputSchema: IssueTransitionInputSchema,
  }).strict(),
  Transition.extend({
    availability: z.literal("externalOnly"),
    reason: Text,
    externalUrl: Text.url(),
  }).strict(),
]);

// Top-level unknown inputs are accepted and stripped. Identity always comes from Context.
export const IssueSearchIssuesInputSchema = z
  .object({
    query: z.string().max(500).optional(),
    containerId: Text.optional(),
    since: Text.optional(),
    limit: z.number().int().min(1).max(100).optional(),
    orderBy: z.literal("createdAt").optional(),
    orderDirection: z.literal("desc").optional(),
  })
  .passthrough()
  .transform(({ query, containerId, since, limit, orderBy, orderDirection }) => ({
    ...(query === undefined ? {} : { query }),
    ...(containerId === undefined ? {} : { containerId }),
    ...(since === undefined ? {} : { since }),
    ...(limit === undefined ? {} : { limit }),
    ...(orderBy === undefined ? {} : { orderBy }),
    ...(orderDirection === undefined ? {} : { orderDirection }),
  }));
export const IssueSearchIssuesOutputSchema = z
  .object({
    issues: z.array(ExternalIssueSchema).max(100),
    next: Text.optional(),
  })
  .strict();
export const IssueGetIssueInputSchema = z
  .object({
    issueId: Text.regex(/\S/).optional(),
    url: z
      .string()
      .url()
      .regex(/^https:\/\/[^/\s?#]+(?:[/?#][^\s]*)?$/)
      .optional(),
  })
  .passthrough()
  .transform(({ issueId, url }) => ({
    ...(issueId === undefined ? {} : { issueId }),
    ...(url === undefined ? {} : { url }),
  }))
  .refine((value) => (value.issueId !== undefined) !== (value.url !== undefined), {
    message: "Provide exactly one of issueId or url",
  });
export const IssueGetIssueOutputSchema = z.object({ issue: ExternalIssueSchema }).strict();
export const IssueGetIssuesInputSchema = z
  .object({
    issueIds: z.array(Text).min(1).max(100).refine(unique, "issueIds must be unique"),
  })
  .passthrough()
  .transform(({ issueIds }) => ({ issueIds }));
export const IssueGetIssuesOutputSchema = z
  .object({
    results: z
      .array(
        z.union([
          z.object({ issueId: Text, issue: ExternalIssueSchema }).strict(),
          z.object({ issueId: Text, error: IssueErrorSchema }).strict(),
        ])
      )
      .min(1)
      .max(100),
  })
  .strict();
export const IssueGetIssueTransitionsInputSchema = z
  .object({ issueId: Text })
  .passthrough()
  .transform(({ issueId }) => ({ issueId }));
export const IssueGetIssueTransitionsOutputSchema = z
  .object({
    stateToken: Text,
    transitions: z.array(IssueTransitionSchema),
  })
  .strict();
export const IssueExecuteIssueTransitionInputSchema = z
  .object({
    issueId: Text,
    transitionId: Text,
    stateToken: Text,
    requestId: Text,
    fields: z.record(Scalar).optional(),
  })
  .passthrough()
  .transform(({ issueId, transitionId, stateToken, requestId, fields }) => ({
    issueId,
    transitionId,
    stateToken,
    requestId,
    ...(fields === undefined ? {} : { fields }),
  }));
export const IssueExecuteIssueTransitionOutputSchema = IssueGetIssueOutputSchema;

export type ExternalIssueState = z.infer<typeof ExternalIssueStateSchema>;
export type ExternalIssue = ProtoBacked<z.infer<typeof ExternalIssueSchema>, ProtoExternalIssue>;
export type IssueError = ProtoBacked<z.infer<typeof IssueErrorSchema>, ProtoIssueError>;
export type IssueTransition = ProtoBacked<
  z.infer<typeof IssueTransitionSchema>,
  ProtoIssueTransition
>;
export type IssueSearchIssuesInput = ProtoBacked<
  z.infer<typeof IssueSearchIssuesInputSchema>,
  ProtoIssueSearchIssuesInput
>;
export type IssueSearchIssuesOutput = ProtoBacked<
  z.infer<typeof IssueSearchIssuesOutputSchema>,
  ProtoIssueSearchIssuesOutput
>;
export type IssueGetIssueInput = ProtoBacked<
  z.infer<typeof IssueGetIssueInputSchema>,
  ProtoIssueGetIssueInput
>;
export type IssueGetIssueOutput = ProtoBacked<
  z.infer<typeof IssueGetIssueOutputSchema>,
  ProtoIssueGetIssueOutput
>;
export type IssueGetIssuesInput = ProtoBacked<
  z.infer<typeof IssueGetIssuesInputSchema>,
  ProtoIssueGetIssuesInput
>;
export type IssueGetIssuesOutput = ProtoBacked<
  z.infer<typeof IssueGetIssuesOutputSchema>,
  ProtoIssueGetIssuesOutput
>;
export type IssueGetIssueTransitionsInput = ProtoBacked<
  z.infer<typeof IssueGetIssueTransitionsInputSchema>,
  ProtoIssueGetIssueTransitionsInput
>;
export type IssueGetIssueTransitionsOutput = ProtoBacked<
  z.infer<typeof IssueGetIssueTransitionsOutputSchema>,
  ProtoIssueGetIssueTransitionsOutput
>;
export type IssueExecuteIssueTransitionInput = ProtoBacked<
  z.infer<typeof IssueExecuteIssueTransitionInputSchema>,
  ProtoIssueExecuteIssueTransitionInput
>;
export type IssueExecuteIssueTransitionOutput = ProtoBacked<
  z.infer<typeof IssueExecuteIssueTransitionOutputSchema>,
  ProtoIssueExecuteIssueTransitionOutput
>;
