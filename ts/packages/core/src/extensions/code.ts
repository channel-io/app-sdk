import { z } from "zod";
import { maxCodePoints } from "../utils/unicode-string.js";
import type {
  CodeContextBlock as ProtoCodeContextBlock,
  CodeSendInputInput as ProtoCodeSendInputInput,
  CodeGetSessionInput as ProtoCodeGetSessionInput,
  CodeStopSessionInput as ProtoCodeStopSessionInput,
  CodeSessionReceipt as ProtoCodeSessionReceipt,
  CodeSessionError as ProtoCodeSessionError,
  CodeSessionQuestion as ProtoCodeSessionQuestion,
  CodeSessionResult as ProtoCodeSessionResult,
  CodeSessionArtifact as ProtoCodeSessionArtifact,
  CodeSessionObservation as ProtoCodeSessionObservation,
  CodeSessionSnapshot as ProtoCodeSessionSnapshot,
  CodeSessionMessage as ProtoCodeSessionMessage,
  CodeSessionEvent as ProtoCodeSessionEvent,
  CodePublicationReceipt as ProtoCodePublicationReceipt,
} from "../gen/channel/app/sdk/v1/extension.js";
type ProtoBacked<T, Proto> = T & Omit<Proto, keyof T>;

// Explicit whitespace set keeps ECMAScript, Go RE2 and JSON Schema validators aligned.
const nonBlankPattern =
  "[^\\t\\n\\v\\f\\r \u0085\u00a0\u1680\u2000-\u200a\u2028\u2029\u202f\u205f\u3000\ufeff]";
function nonBlank(maximum: number) {
  return maxCodePoints(z.string().min(1).regex(new RegExp(nonBlankPattern)), maximum);
}
export const CodeInvocationContextSchema = z.object({ idempotencyKey: nonBlank(200) });
const timestampPattern =
  "^([0-9]{3}[1-9]|[0-9]{2}[1-9][0-9]|[0-9][1-9][0-9]{2}|[1-9][0-9]{3})-[0-9]{2}-[0-9]{2}T([01][0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9](\\.[0-9]+)?(Z|[+-]([01][0-9]|2[0-3]):[0-5][0-9])$";
const timestamp = z.string().datetime({ offset: true }).regex(new RegExp(timestampPattern));

function withinBytes(value: unknown, maximum: number): boolean {
  try {
    const json = JSON.stringify(value);
    return typeof json === "string" && new TextEncoder().encode(json).length <= maximum;
  } catch {
    return false;
  }
}
function boundedInput<T extends z.ZodTypeAny>(schema: T) {
  return z.preprocess((value, ctx) => {
    if (!withinBytes(value, 256 * 1024))
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Input exceeds 256 KiB of UTF-8 JSON" });
    return value;
  }, schema);
}
export const CodeContextBlockSchema = z
  .object({
    title: nonBlank(256),
    text: nonBlank(32768),
    sourceUrl: maxCodePoints(z.string().url().regex(new RegExp("^https://")), 2048).optional(),
  })
  .strict();
export type CodeContextBlock = ProtoBacked<
  z.infer<typeof CodeContextBlockSchema>,
  ProtoCodeContextBlock
>;

export const CodeSendInputInputSchema = boundedInput(
  z
    .object({
      sessionKey: nonBlank(200),
      text: nonBlank(32768),
      context: z.array(CodeContextBlockSchema).max(8).optional(),
    })
    .strip()
);
export type CodeSendInputInput = ProtoBacked<
  z.infer<typeof CodeSendInputInputSchema>,
  ProtoCodeSendInputInput
>;

export const CodeGetSessionInputSchema = boundedInput(
  z.object({ sessionKey: nonBlank(200) }).strip()
);
export type CodeGetSessionInput = ProtoBacked<
  z.infer<typeof CodeGetSessionInputSchema>,
  ProtoCodeGetSessionInput
>;

export const CodeStopSessionInputSchema = boundedInput(
  z
    .object({
      sessionKey: nonBlank(200),
      reason: nonBlank(2048).optional(),
    })
    .strip()
);
export type CodeStopSessionInput = ProtoBacked<
  z.infer<typeof CodeStopSessionInputSchema>,
  ProtoCodeStopSessionInput
>;

export const CodeSessionReceiptSchema = z
  .object({
    sessionKey: nonBlank(200),
    accepted: z.literal(true),
  })
  .strict();
export type CodeSessionReceipt = ProtoBacked<
  z.infer<typeof CodeSessionReceiptSchema>,
  ProtoCodeSessionReceipt
>;

export const CodeSessionErrorSchema = z
  .object({
    code: nonBlank(100),
    message: nonBlank(2048),
    retryable: z.boolean(),
  })
  .strict();
export type CodeSessionError = ProtoBacked<
  z.infer<typeof CodeSessionErrorSchema>,
  ProtoCodeSessionError
>;

export const CodeSessionQuestionSchema = z.union([
  z
    .object({
      text: nonBlank(8192),
      answerVia: z.literal("sendInput"),
      source: z.enum(["provider_message", "agent_report", "adapter"]),
      actionUrl: maxCodePoints(z.string().url().regex(new RegExp("^https://")), 2048).optional(),
    })
    .strict(),
  z
    .object({
      text: nonBlank(8192),
      answerVia: z.literal("provider_ui"),
      source: z.enum(["provider_message", "agent_report", "adapter"]),
      actionUrl: maxCodePoints(z.string().url().regex(new RegExp("^https://")), 2048),
    })
    .strict(),
]);
export type CodeSessionQuestion = ProtoBacked<
  z.infer<typeof CodeSessionQuestionSchema>,
  ProtoCodeSessionQuestion
>;

export const CodeSessionResultSchema = z
  .object({
    text: nonBlank(8192),
    source: z.enum(["provider_message", "agent_report", "adapter"]),
    recordedAt: timestamp,
    limitations: z.array(nonBlank(2048)).max(20),
  })
  .strict();
export type CodeSessionResult = ProtoBacked<
  z.infer<typeof CodeSessionResultSchema>,
  ProtoCodeSessionResult
>;

export const CodeSessionArtifactSchema = z
  .object({
    kind: nonBlank(64),
    title: nonBlank(512),
    url: maxCodePoints(z.string().url().regex(new RegExp("^https://")), 2048),
  })
  .strict();
export type CodeSessionArtifact = ProtoBacked<
  z.infer<typeof CodeSessionArtifactSchema>,
  ProtoCodeSessionArtifact
>;

export const CodeSessionObservationSchema = z.union([
  z.object({ status: z.literal("current"), observedAt: timestamp }).strict(),
  z
    .object({
      status: z.enum(["stale", "unknown"]),
      observedAt: z.union([timestamp, z.null()]),
    })
    .strict(),
]);
export type CodeSessionObservation = ProtoBacked<
  z.infer<typeof CodeSessionObservationSchema>,
  ProtoCodeSessionObservation
>;

export const CodeSessionSnapshotSchema = z
  .union([
    z
      .object({
        sessionKey: nonBlank(200),
        version: z.string().max(30).regex(new RegExp("^(0|[1-9][0-9]*)$")),
        status: z.enum(["needs_input"]),
        pendingInputCount: z.number().int().safe().min(0).max(2147483647),
        question: CodeSessionQuestionSchema,
        lastResult: z.union([CodeSessionResultSchema, z.null()]),
        artifacts: z.array(CodeSessionArtifactSchema).max(50),
        error: z.union([CodeSessionErrorSchema, z.null()]),
        observation: CodeSessionObservationSchema,
        updatedAt: timestamp,
      })
      .strict(),
    z
      .object({
        sessionKey: nonBlank(200),
        version: z.string().max(30).regex(new RegExp("^(0|[1-9][0-9]*)$")),
        status: z.enum(["queued"]),
        pendingInputCount: z.number().int().safe().min(1).max(2147483647),
        question: z.null(),
        lastResult: z.union([CodeSessionResultSchema, z.null()]),
        artifacts: z.array(CodeSessionArtifactSchema).max(50),
        error: z.union([CodeSessionErrorSchema, z.null()]),
        observation: CodeSessionObservationSchema,
        updatedAt: timestamp,
      })
      .strict(),
    z
      .object({
        sessionKey: nonBlank(200),
        version: z.string().max(30).regex(new RegExp("^(0|[1-9][0-9]*)$")),
        status: z.enum(["idle", "stopped"]),
        pendingInputCount: z.literal(0),
        question: z.null(),
        lastResult: z.union([CodeSessionResultSchema, z.null()]),
        artifacts: z.array(CodeSessionArtifactSchema).max(50),
        error: z.union([CodeSessionErrorSchema, z.null()]),
        observation: CodeSessionObservationSchema,
        updatedAt: timestamp,
      })
      .strict(),
    z
      .object({
        sessionKey: nonBlank(200),
        version: z.string().max(30).regex(new RegExp("^(0|[1-9][0-9]*)$")),
        status: z.enum(["failed", "unavailable"]),
        pendingInputCount: z.number().int().safe().min(0).max(2147483647),
        question: z.null(),
        lastResult: z.union([CodeSessionResultSchema, z.null()]),
        artifacts: z.array(CodeSessionArtifactSchema).max(50),
        error: CodeSessionErrorSchema,
        observation: CodeSessionObservationSchema,
        updatedAt: timestamp,
      })
      .strict(),
    z
      .object({
        sessionKey: nonBlank(200),
        version: z.string().max(30).regex(new RegExp("^(0|[1-9][0-9]*)$")),
        status: z.enum(["running", "stopping"]),
        pendingInputCount: z.number().int().safe().min(0).max(2147483647),
        question: z.null(),
        lastResult: z.union([CodeSessionResultSchema, z.null()]),
        artifacts: z.array(CodeSessionArtifactSchema).max(50),
        error: z.union([CodeSessionErrorSchema, z.null()]),
        observation: CodeSessionObservationSchema,
        updatedAt: timestamp,
      })
      .strict(),
  ])
  .refine((value) => withinBytes(value, 64 * 1024), "Snapshot exceeds 64 KiB of UTF-8 JSON");
export type CodeSessionSnapshot = ProtoBacked<
  z.infer<typeof CodeSessionSnapshotSchema>,
  ProtoCodeSessionSnapshot
>;

export const CodeSessionMessageSchema = z
  .object({
    text: nonBlank(8192),
    source: z.enum(["provider_message", "agent_report", "adapter"]),
  })
  .strict();
export type CodeSessionMessage = ProtoBacked<
  z.infer<typeof CodeSessionMessageSchema>,
  ProtoCodeSessionMessage
>;

export const CodeSessionEventSchema = z
  .union([
    z
      .object({
        sessionKey: nonBlank(200),
        eventId: nonBlank(200),
        sequence: z.string().max(30).regex(new RegExp("^[1-9][0-9]*$")),
        recordedAt: timestamp,
        occurredAt: timestamp.optional(),
        type: z.literal("session.updated"),
        payload: CodeSessionSnapshotSchema,
      })
      .strict(),
    z
      .object({
        sessionKey: nonBlank(200),
        eventId: nonBlank(200),
        sequence: z.string().max(30).regex(new RegExp("^[1-9][0-9]*$")),
        recordedAt: timestamp,
        occurredAt: timestamp.optional(),
        type: z.literal("session.message"),
        payload: CodeSessionMessageSchema,
      })
      .strict(),
  ])
  .superRefine((event, ctx) => {
    if (!withinBytes(event, 64 * 1024))
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Event exceeds 64 KiB of UTF-8 JSON" });
    if (
      event.type === "session.updated" &&
      (event.payload.sessionKey !== event.sessionKey ||
        event.payload.version !== event.sequence ||
        event.payload.updatedAt !== event.recordedAt)
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["payload"],
        message: "Snapshot must match event sessionKey, sequence and recordedAt",
      });
    }
  });
export type CodeSessionEvent = ProtoBacked<
  z.infer<typeof CodeSessionEventSchema>,
  ProtoCodeSessionEvent
>;

export const CodePublicationReceiptSchema = z
  .object({
    accepted: z.literal(true),
    sessionKey: nonBlank(200),
    eventId: nonBlank(200),
    sequence: z.string().max(30).regex(new RegExp("^[1-9][0-9]*$")),
  })
  .strict();
export type CodePublicationReceipt = ProtoBacked<
  z.infer<typeof CodePublicationReceiptSchema>,
  ProtoCodePublicationReceipt
>;
