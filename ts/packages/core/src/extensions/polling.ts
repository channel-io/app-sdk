import { z } from "zod";
import type {
  PollingGetPollersOutput as ProtoGetPollersOutput,
  PollingGetTargetManagersInput as ProtoGetPollingTargetManagersInput,
  PollingGetTargetManagersOutput as ProtoGetPollingTargetManagersOutput,
  PollingGetTargetChannelsInput as ProtoGetPollingTargetChannelsInput,
  PollingGetTargetChannelsOutput as ProtoGetPollingTargetChannelsOutput,
  PollingManagerTarget as ProtoPollingManagerTarget,
  PollingPoller as ProtoPollingPoller,
} from "../gen/channel/app/sdk/v1/extension.js";

type ProtoBacked<T, Proto> = T & Proto;

const PositiveIntegerSchema = z.number().int().min(1);
const NonEmptyStringSchema = z.string().min(1);

export const PollingExecutionScopeSchema = z.enum(["channel", "manager"]);

/**
 * Polling handler metadata returned from extension.polling.metadata.getPollers.
 */
const PollingPollerFieldsSchema = z.object({
  pollerId: z
    .string()
    .trim()
    .min(1)
    .max(256)
    .refine(
      (value) => new TextEncoder().encode(value).length <= 256,
      "pollerId must be at most 256 UTF-8 bytes"
    )
    .optional(),
  /**
   * Full app function name invoked with channel context and empty params.
   */
  functionName: NonEmptyStringSchema,
  /**
   * Handler run creation interval, in seconds.
   */
  intervalSeconds: PositiveIntegerSchema.optional(),
  cronExpression: z.string().trim().min(1).max(256).optional(),
  timezone: z.string().trim().min(1).optional(),
  /**
   * Per-call timeout, in seconds. AppStore defaults to 30 when omitted.
   */
  timeoutSeconds: PositiveIntegerSchema.optional(),
  /**
   * Per-handler max in-flight calls per polling worker process.
   */
  maxConcurrency: PositiveIntegerSchema.optional(),
  /**
   * Per-handler request rate per polling worker process.
   */
  rps: PositiveIntegerSchema.optional(),
  /**
   * Caller scope for the polling function. AppStore defaults to channel when omitted.
   */
  executionScope: PollingExecutionScopeSchema.optional(),
});

// Union branches preserve the mutually exclusive schedule contract in generated JSON Schema.
export const PollingPollerSchema = z.union([
  PollingPollerFieldsSchema.extend({
    intervalSeconds: PositiveIntegerSchema,
    cronExpression: z.never().optional(),
    timezone: z.never().optional(),
  }),
  PollingPollerFieldsSchema.extend({
    intervalSeconds: z.never().optional(),
    cronExpression: z
      .string()
      .trim()
      .min(1)
      .max(256)
      .refine(
        (value) => value.split(/\s+/).length === 5 && !value.includes("="),
        "Use five cron fields; seconds, descriptors and inline timezone overrides are unsupported"
      ),
    timezone: z.string().refine((value) => {
      if (value !== "UTC" && !value.includes("/")) return false;
      try {
        new Intl.DateTimeFormat("en", { timeZone: value });
        return true;
      } catch {
        return false;
      }
    }, "Use an explicit IANA timezone or UTC"),
  }),
]);

export type PollingPoller = ProtoBacked<z.infer<typeof PollingPollerSchema>, ProtoPollingPoller>;

/**
 * Metadata response schema for polling handler registration.
 */
export const GetPollersOutputSchema = z.object({
  pollers: z.array(PollingPollerSchema).superRefine((pollers, ctx) => {
    const seen = new Set<string>();
    pollers.forEach((poller, index) => {
      const id = poller.pollerId ?? poller.functionName.trim();
      if (seen.has(id))
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Duplicate pollerId",
          path: [index, "pollerId"],
        });
      seen.add(id);
    });
  }),
});

export type GetPollersOutput = ProtoBacked<
  z.infer<typeof GetPollersOutputSchema>,
  ProtoGetPollersOutput
>;

/**
 * Input schema for extension.polling.target.getChannels.
 */
export const GetPollingTargetChannelsInputSchema = z.object({
  /**
   * Polling function name from the poller metadata currently being enqueued.
   */
  functionName: NonEmptyStringSchema,
  /**
   * Cursor previously returned as nextCursor.
   */
  cursor: NonEmptyStringSchema.optional(),
  /**
   * Maximum number of channel IDs to return.
   */
  limit: PositiveIntegerSchema.max(500),
});

export type GetPollingTargetChannelsInput = ProtoBacked<
  z.infer<typeof GetPollingTargetChannelsInputSchema>,
  ProtoGetPollingTargetChannelsInput
>;

/**
 * Output schema for extension.polling.target.getChannels.
 */
export const GetPollingTargetChannelsOutputSchema = z
  .object({
    channelIds: z.array(NonEmptyStringSchema),
    nextCursor: NonEmptyStringSchema.optional(),
    hasNextPage: z.boolean().optional(),
  })
  .superRefine((value, ctx) => {
    if (value.hasNextPage === true && !value.nextCursor) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "nextCursor is required when hasNextPage is true",
        path: ["nextCursor"],
      });
    }
  });

export type GetPollingTargetChannelsOutput = ProtoBacked<
  z.infer<typeof GetPollingTargetChannelsOutputSchema>,
  ProtoGetPollingTargetChannelsOutput
>;

/**
 * One manager-scoped polling target resolved by the app.
 */
export const PollingManagerTargetSchema = z.object({
  channelId: NonEmptyStringSchema,
  managerId: NonEmptyStringSchema,
});

export type PollingManagerTarget = ProtoBacked<
  z.infer<typeof PollingManagerTargetSchema>,
  ProtoPollingManagerTarget
>;

/**
 * Input schema for extension.polling.target.getManagers.
 */
export const GetPollingTargetManagersInputSchema = z.object({
  functionName: NonEmptyStringSchema,
  cursor: NonEmptyStringSchema.optional(),
  /**
   * Maximum number of channel/manager targets to return.
   */
  limit: PositiveIntegerSchema.max(500),
});

export type GetPollingTargetManagersInput = ProtoBacked<
  z.infer<typeof GetPollingTargetManagersInputSchema>,
  ProtoGetPollingTargetManagersInput
>;

/**
 * Output schema for extension.polling.target.getManagers.
 */
export const GetPollingTargetManagersOutputSchema = z
  .object({
    targets: z.array(PollingManagerTargetSchema),
    nextCursor: NonEmptyStringSchema.optional(),
    hasNextPage: z.boolean().optional(),
  })
  .superRefine((value, ctx) => {
    if (value.hasNextPage === true && !value.nextCursor) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "nextCursor is required when hasNextPage is true",
        path: ["nextCursor"],
      });
    }
  });

export type GetPollingTargetManagersOutput = ProtoBacked<
  z.infer<typeof GetPollingTargetManagersOutputSchema>,
  ProtoGetPollingTargetManagersOutput
>;
