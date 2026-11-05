import type {
  IssueCreateCommentInput as ProtoIssueCreateCommentInput,
  IssueCreateCommentOutput as ProtoIssueCreateCommentOutput,
  IssueCreateChoice as ProtoIssueCreateChoice,
  IssueCreateFieldValue as ProtoIssueCreateFieldValue,
  IssueCreateFormField as ProtoIssueCreateFormField,
  IssueCreateValues as ProtoIssueCreateValues,
  IssueCreateSelectedValues as ProtoIssueCreateSelectedValues,
  IssueCreateSchemaPage as ProtoIssueCreateSchemaPage,
  IssueGetCreateSchemaInput as ProtoIssueGetCreateSchemaInput,
  IssueGetCreateSchemaOutput as ProtoIssueGetCreateSchemaOutput,
  IssueCreateIssueInput as ProtoIssueCreateIssueInput,
  IssueCreateIssueOutput as ProtoIssueCreateIssueOutput,
  IssueFieldError as ProtoIssueFieldError,
  IssueRecovery as ProtoIssueRecovery,
  IssueSubscriptionStartInput as ProtoIssueSubscriptionStartInput,
  IssueSubscriptionStartOutput as ProtoIssueSubscriptionStartOutput,
  IssueSubscriptionStopInput as ProtoIssueSubscriptionStopInput,
  IssueSubscriptionStopOutput as ProtoIssueSubscriptionStopOutput,
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
      "invalidInput",
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
    fieldErrors: z.array(z.object({ key: Text, message: Text }).strict()).optional(),
    recovery: z
      .object({ sourceIssueId: Text, externalUrl: Text.url().optional() })
      .strict()
      .optional(),
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

// Identity is selected by Issue and bound by App Store; it is not a credential.
const SubscriptionID = z
  .string()
  .min(1)
  .max(128)
  .regex(/^[A-Za-z0-9_-]+$/)
  .refine((value) => value.trim() === value, "Whitespace is not allowed");
export const IssueSubscriptionStartInputSchema = z
  .object({ subscriptionId: SubscriptionID, issueId: Text.regex(/\S/) })
  .passthrough()
  .transform(({ subscriptionId, issueId }) => ({ subscriptionId, issueId }));
export const IssueSubscriptionStartOutputSchema = z
  .object({
    status: z.literal("active"),
    issue: ExternalIssueSchema,
    providerTenantId: Text.regex(/\S/),
  })
  .strict();
export const IssueSubscriptionStopInputSchema = z
  .object({ subscriptionId: SubscriptionID })
  .passthrough()
  .transform(({ subscriptionId }) => ({ subscriptionId }));
export const IssueSubscriptionStopOutputSchema = z.object({ stopped: z.literal(true) }).strict();
export type IssueSubscriptionStartInput = ProtoBacked<
  z.infer<typeof IssueSubscriptionStartInputSchema>,
  ProtoIssueSubscriptionStartInput
>;
export type IssueSubscriptionStartOutput = ProtoBacked<
  z.infer<typeof IssueSubscriptionStartOutputSchema>,
  ProtoIssueSubscriptionStartOutput
>;
export type IssueSubscriptionStopInput = ProtoBacked<
  z.infer<typeof IssueSubscriptionStopInputSchema>,
  ProtoIssueSubscriptionStopInput
>;
export type IssueSubscriptionStopOutput = ProtoBacked<
  z.infer<typeof IssueSubscriptionStopOutputSchema>,
  ProtoIssueSubscriptionStopOutput
>;

const CreateNumber = z.number().finite();
const CreateValue = z.union([
  z.string(),
  CreateNumber,
  z.boolean(),
  z.array(z.string()).refine(unique),
  z.array(CreateNumber).refine(unique),
]);
export const IssueCreateChoiceSchema = z
  .object({ label: Text, value: z.union([z.string(), CreateNumber]) })
  .strict();
export const IssueCreateFieldValueSchema = z
  .object({
    key: Text.refine((key) => !["containerId", "title", "description", "templateId"].includes(key)),
    value: CreateValue,
  })
  .strict();
const CreateFields = z
  .array(IssueCreateFieldValueSchema)
  .refine((fields) => unique(fields.map((field) => field.key)));
const CreateValuesShape = {
  containerId: Text.regex(/\S/),
  title: z.string().optional(),
  description: z.string().optional(),
  templateId: Text.optional(),
  fields: CreateFields.optional(),
};
export const IssueCreateValuesSchema = z.object(CreateValuesShape).strict();
export const IssueCreateSelectedValuesSchema = IssueCreateValuesSchema.partial();
export const IssueCreateSchemaPageSchema = z
  .object({ key: Text.regex(/\S/), since: Text.regex(/\S/) })
  .strict();
export const IssueCreateFormFieldSchema = z
  .object({
    key: Text,
    label: Text,
    type: z.enum(["text", "textarea", "number", "checkbox", "select", "multiselect"]),
    required: z.boolean().optional(),
    readOnly: z.boolean().optional(),
    defaultValue: CreateValue.optional(),
    description: z.string().optional(),
    choices: z.array(IssueCreateChoiceSchema).optional(),
    min: CreateNumber.optional(),
    max: CreateNumber.optional(),
    maxLength: z.number().int().nonnegative().optional(),
    maxItems: z.number().int().nonnegative().optional(),
    next: Text.optional(),
    triggerFieldKeys: z
      .array(z.enum(["containerId", "templateId"]))
      .refine(unique)
      .optional(),
  })
  .strict()
  .superRefine((field, ctx) => {
    const fail = (message: string) => ctx.addIssue({ code: z.ZodIssueCode.custom, message });
    const selectable = field.type === "select" || field.type === "multiselect";
    if (selectable && !field.choices) fail("Select fields require choices");
    if (
      field.choices &&
      (!selectable ||
        !unique(field.choices.map((choice) => choice.value)) ||
        new Set(field.choices.map((choice) => typeof choice.value)).size > 1)
    )
      fail("Invalid choices");
    if (field.min !== undefined && field.max !== undefined && field.min > field.max)
      fail("Invalid bounds");
    if (field.readOnly && field.defaultValue === undefined)
      fail("Read-only fields require a default");
    const value = field.defaultValue;
    if (value === undefined) return;
    if (
      ((field.type === "text" || field.type === "textarea") && typeof value !== "string") ||
      (field.type === "number" && typeof value !== "number") ||
      (field.type === "checkbox" && typeof value !== "boolean") ||
      (field.type === "select" && typeof value !== "string" && typeof value !== "number") ||
      (field.type === "multiselect" && !Array.isArray(value))
    ) {
      fail("Invalid default type");
      return;
    }
    if (
      field.required &&
      ((typeof value === "string" && !value.trim()) || (Array.isArray(value) && value.length === 0))
    )
      fail("Required default is empty");
    if (
      (typeof value === "string" &&
        field.maxLength !== undefined &&
        value.length > field.maxLength) ||
      (Array.isArray(value) && field.maxItems !== undefined && value.length > field.maxItems) ||
      (typeof value === "number" &&
        ((field.min !== undefined && value < field.min) ||
          (field.max !== undefined && value > field.max)))
    )
      fail("Default exceeds bounds");
    if (field.type === "text" && typeof value === "string" && /[\r\n]/.test(value))
      fail("Text default must be a single line");
    if (selectable && field.choices?.length) {
      const choiceType = typeof field.choices[0]!.value;
      if ((Array.isArray(value) ? value : [value]).some((item) => typeof item !== choiceType))
        fail("Invalid default choice type");
    }
  });
export const IssueGetCreateSchemaInputSchema = z
  .object({
    selected: IssueCreateSelectedValuesSchema.optional(),
    page: IssueCreateSchemaPageSchema.optional(),
  })
  .passthrough()
  .transform(({ selected, page }) => ({
    ...(selected === undefined ? {} : { selected }),
    ...(page === undefined ? {} : { page }),
  }));
export const IssueGetCreateSchemaOutputSchema = z.discriminatedUnion("availability", [
  z
    .object({
      availability: z.literal("available"),
      accountRef: Text.regex(/\S/),
      fields: z
        .array(IssueCreateFormFieldSchema)
        .refine((fields) => unique(fields.map((field) => field.key))),
    })
    .strict(),
  z
    .object({ availability: z.literal("externalOnly"), reason: Text, externalUrl: Text.url() })
    .strict(),
]);
export const IssueCreateIssueInputSchema = z
  .object({
    ...CreateValuesShape,
    requestId: z
      .string()
      .length(36)
      .regex(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/),
    accountRef: Text.regex(/\S/),
    recoveryOnly: z.boolean().optional(),
  })
  .passthrough()
  .transform(
    ({
      containerId,
      title,
      description,
      templateId,
      fields,
      requestId,
      accountRef,
      recoveryOnly,
    }) => ({
      containerId,
      requestId,
      accountRef,
      ...(title === undefined ? {} : { title }),
      ...(description === undefined ? {} : { description }),
      ...(templateId === undefined ? {} : { templateId }),
      ...(fields === undefined ? {} : { fields }),
      ...(recoveryOnly === undefined ? {} : { recoveryOnly }),
    })
  );
export const IssueCreateIssueOutputSchema = z
  .object({
    issue: ExternalIssueSchema.extend({ container: z.object({ id: Text, name: Text }).strict() }),
  })
  .strict();
export const IssueFieldErrorSchema = IssueErrorSchema.shape.fieldErrors.unwrap().element;
export const IssueRecoverySchema = IssueErrorSchema.shape.recovery.unwrap();
export type IssueCreateChoice = ProtoBacked<
  z.infer<typeof IssueCreateChoiceSchema>,
  ProtoIssueCreateChoice
>;
export type IssueCreateFieldValue = ProtoBacked<
  z.infer<typeof IssueCreateFieldValueSchema>,
  ProtoIssueCreateFieldValue
>;
export type IssueCreateFormField = ProtoBacked<
  z.infer<typeof IssueCreateFormFieldSchema>,
  ProtoIssueCreateFormField
>;
export type IssueCreateValues = ProtoBacked<
  z.infer<typeof IssueCreateValuesSchema>,
  ProtoIssueCreateValues
>;
export type IssueCreateSelectedValues = ProtoBacked<
  z.infer<typeof IssueCreateSelectedValuesSchema>,
  ProtoIssueCreateSelectedValues
>;
export type IssueCreateSchemaPage = ProtoBacked<
  z.infer<typeof IssueCreateSchemaPageSchema>,
  ProtoIssueCreateSchemaPage
>;
export type IssueGetCreateSchemaInput = ProtoBacked<
  z.infer<typeof IssueGetCreateSchemaInputSchema>,
  ProtoIssueGetCreateSchemaInput
>;
export type IssueGetCreateSchemaOutput = ProtoBacked<
  z.infer<typeof IssueGetCreateSchemaOutputSchema>,
  ProtoIssueGetCreateSchemaOutput
>;
export type IssueCreateIssueInput = ProtoBacked<
  z.infer<typeof IssueCreateIssueInputSchema>,
  ProtoIssueCreateIssueInput
>;
export type IssueCreateIssueOutput = ProtoBacked<
  z.infer<typeof IssueCreateIssueOutputSchema>,
  ProtoIssueCreateIssueOutput
>;
export type IssueFieldError = ProtoBacked<
  z.infer<typeof IssueFieldErrorSchema>,
  ProtoIssueFieldError
>;
export type IssueRecovery = ProtoBacked<z.infer<typeof IssueRecoverySchema>, ProtoIssueRecovery>;

export const IssueCreateCommentInputSchema = z
  .object({
    issueId: Text.regex(/\S/),
    body: z.string().max(16000).regex(/\S/),
    requestId: z
      .string()
      .length(36)
      .regex(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/),
    accountRef: Text.regex(/\S/),
    recoveryOnly: z.boolean().optional(),
  })
  .strip();
export const IssueCreateCommentOutputSchema = z
  .object({
    commentId: Text.regex(/\S/),
    url: z
      .string()
      .url()
      .regex(/^[Hh][Tt][Tt][Pp][Ss]:\/\/[^/\s\\?#]+(?:[/?#][^\s\\]*)?$/)
      .optional(),
  })
  .strict();
export type IssueCreateCommentInput = ProtoBacked<
  z.infer<typeof IssueCreateCommentInputSchema>,
  ProtoIssueCreateCommentInput
>;
export type IssueCreateCommentOutput = ProtoBacked<
  z.infer<typeof IssueCreateCommentOutputSchema>,
  ProtoIssueCreateCommentOutput
>;
