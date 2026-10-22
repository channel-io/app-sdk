import { z } from "zod";
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
    title: z.string().min(1).max(256).regex(new RegExp("\\S")),
    text: z.string().min(1).max(32768).regex(new RegExp("\\S")),
    sourceUrl: z.string().url().max(2048).regex(new RegExp("^https://")).optional(),
  })
  .strict();
export type CodeContextBlock = ProtoBacked<
  z.infer<typeof CodeContextBlockSchema>,
  ProtoCodeContextBlock
>;

export const CodeSendInputInputSchema = boundedInput(
  z
    .object({
      sessionKey: z.string().min(1).max(200).regex(new RegExp("\\S")),
      text: z.string().min(1).max(32768).regex(new RegExp("\\S")),
      context: z.array(CodeContextBlockSchema).max(8).optional(),
    })
    .strip()
);
export type CodeSendInputInput = ProtoBacked<
  z.infer<typeof CodeSendInputInputSchema>,
  ProtoCodeSendInputInput
>;

export const CodeGetSessionInputSchema = z
  .object({ sessionKey: z.string().min(1).max(200).regex(new RegExp("\\S")) })
  .strip();
export type CodeGetSessionInput = ProtoBacked<
  z.infer<typeof CodeGetSessionInputSchema>,
  ProtoCodeGetSessionInput
>;

export const CodeStopSessionInputSchema = z
  .object({
    sessionKey: z.string().min(1).max(200).regex(new RegExp("\\S")),
    reason: z.string().min(1).max(2048).regex(new RegExp("\\S")).optional(),
  })
  .strip();
export type CodeStopSessionInput = ProtoBacked<
  z.infer<typeof CodeStopSessionInputSchema>,
  ProtoCodeStopSessionInput
>;

export const CodeSessionReceiptSchema = z
  .object({
    sessionKey: z.string().min(1).max(200).regex(new RegExp("\\S")),
    accepted: z.literal(true),
  })
  .strict();
export type CodeSessionReceipt = ProtoBacked<
  z.infer<typeof CodeSessionReceiptSchema>,
  ProtoCodeSessionReceipt
>;

export const CodeSessionErrorSchema = z
  .object({
    code: z.string().min(1).max(100).regex(new RegExp("\\S")),
    message: z.string().min(1).max(2048).regex(new RegExp("\\S")),
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
      text: z.string().min(1).max(8192).regex(new RegExp("\\S")),
      answerVia: z.literal("sendInput"),
      source: z.enum(["provider_message", "agent_report", "adapter"]),
      actionUrl: z.string().url().max(2048).regex(new RegExp("^https://")).optional(),
    })
    .strict(),
  z
    .object({
      text: z.string().min(1).max(8192).regex(new RegExp("\\S")),
      answerVia: z.literal("provider_ui"),
      source: z.enum(["provider_message", "agent_report", "adapter"]),
      actionUrl: z.string().url().max(2048).regex(new RegExp("^https://")),
    })
    .strict(),
]);
export type CodeSessionQuestion = ProtoBacked<
  z.infer<typeof CodeSessionQuestionSchema>,
  ProtoCodeSessionQuestion
>;

export const CodeSessionResultSchema = z
  .object({
    text: z.string().min(1).max(8192).regex(new RegExp("\\S")),
    source: z.enum(["provider_message", "agent_report", "adapter"]),
    recordedAt: z.string().datetime({ offset: true }),
    limitations: z.array(z.string().min(1).max(2048).regex(new RegExp("\\S"))).max(20),
  })
  .strict();
export type CodeSessionResult = ProtoBacked<
  z.infer<typeof CodeSessionResultSchema>,
  ProtoCodeSessionResult
>;

export const CodeSessionArtifactSchema = z
  .object({
    kind: z.string().min(1).max(64).regex(new RegExp("\\S")),
    title: z.string().min(1).max(512).regex(new RegExp("\\S")),
    url: z.string().url().max(2048).regex(new RegExp("^https://")),
  })
  .strict();
export type CodeSessionArtifact = ProtoBacked<
  z.infer<typeof CodeSessionArtifactSchema>,
  ProtoCodeSessionArtifact
>;

export const CodeSessionObservationSchema = z.union([
  z
    .object({ status: z.literal("current"), observedAt: z.string().datetime({ offset: true }) })
    .strict(),
  z
    .object({
      status: z.enum(["stale", "unknown"]),
      observedAt: z.union([z.string().datetime({ offset: true }), z.null()]),
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
        sessionKey: z.string().min(1).max(200).regex(new RegExp("\\S")),
        version: z.string().max(30).regex(new RegExp("^(0|[1-9][0-9]*)$")),
        status: z.enum(["needs_input"]),
        pendingInputCount: z.number().int().safe().min(0),
        question: CodeSessionQuestionSchema,
        lastResult: z.union([CodeSessionResultSchema, z.null()]),
        artifacts: z.array(CodeSessionArtifactSchema).max(50),
        error: z.union([CodeSessionErrorSchema, z.null()]),
        observation: CodeSessionObservationSchema,
        updatedAt: z.string().datetime({ offset: true }),
      })
      .strict(),
    z
      .object({
        sessionKey: z.string().min(1).max(200).regex(new RegExp("\\S")),
        version: z.string().max(30).regex(new RegExp("^(0|[1-9][0-9]*)$")),
        status: z.enum(["queued"]),
        pendingInputCount: z.number().int().safe().min(1),
        question: z.null(),
        lastResult: z.union([CodeSessionResultSchema, z.null()]),
        artifacts: z.array(CodeSessionArtifactSchema).max(50),
        error: z.union([CodeSessionErrorSchema, z.null()]),
        observation: CodeSessionObservationSchema,
        updatedAt: z.string().datetime({ offset: true }),
      })
      .strict(),
    z
      .object({
        sessionKey: z.string().min(1).max(200).regex(new RegExp("\\S")),
        version: z.string().max(30).regex(new RegExp("^(0|[1-9][0-9]*)$")),
        status: z.enum(["idle", "stopped"]),
        pendingInputCount: z.literal(0),
        question: z.null(),
        lastResult: z.union([CodeSessionResultSchema, z.null()]),
        artifacts: z.array(CodeSessionArtifactSchema).max(50),
        error: z.union([CodeSessionErrorSchema, z.null()]),
        observation: CodeSessionObservationSchema,
        updatedAt: z.string().datetime({ offset: true }),
      })
      .strict(),
    z
      .object({
        sessionKey: z.string().min(1).max(200).regex(new RegExp("\\S")),
        version: z.string().max(30).regex(new RegExp("^(0|[1-9][0-9]*)$")),
        status: z.enum(["failed", "unavailable"]),
        pendingInputCount: z.number().int().safe().min(0),
        question: z.null(),
        lastResult: z.union([CodeSessionResultSchema, z.null()]),
        artifacts: z.array(CodeSessionArtifactSchema).max(50),
        error: CodeSessionErrorSchema,
        observation: CodeSessionObservationSchema,
        updatedAt: z.string().datetime({ offset: true }),
      })
      .strict(),
    z
      .object({
        sessionKey: z.string().min(1).max(200).regex(new RegExp("\\S")),
        version: z.string().max(30).regex(new RegExp("^(0|[1-9][0-9]*)$")),
        status: z.enum(["running", "stopping"]),
        pendingInputCount: z.number().int().safe().min(0),
        question: z.null(),
        lastResult: z.union([CodeSessionResultSchema, z.null()]),
        artifacts: z.array(CodeSessionArtifactSchema).max(50),
        error: z.union([CodeSessionErrorSchema, z.null()]),
        observation: CodeSessionObservationSchema,
        updatedAt: z.string().datetime({ offset: true }),
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
    text: z.string().min(1).max(8192).regex(new RegExp("\\S")),
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
        sessionKey: z.string().min(1).max(200).regex(new RegExp("\\S")),
        eventId: z.string().min(1).max(200).regex(new RegExp("\\S")),
        sequence: z.string().max(30).regex(new RegExp("^[1-9][0-9]*$")),
        recordedAt: z.string().datetime({ offset: true }),
        occurredAt: z.string().datetime({ offset: true }).optional(),
        type: z.literal("session.updated"),
        payload: CodeSessionSnapshotSchema,
      })
      .strict(),
    z
      .object({
        sessionKey: z.string().min(1).max(200).regex(new RegExp("\\S")),
        eventId: z.string().min(1).max(200).regex(new RegExp("\\S")),
        sequence: z.string().max(30).regex(new RegExp("^[1-9][0-9]*$")),
        recordedAt: z.string().datetime({ offset: true }),
        occurredAt: z.string().datetime({ offset: true }).optional(),
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
    sessionKey: z.string().min(1).max(200).regex(new RegExp("\\S")),
    eventId: z.string().min(1).max(200).regex(new RegExp("\\S")),
    sequence: z.string().max(30).regex(new RegExp("^[1-9][0-9]*$")),
  })
  .strict();
export type CodePublicationReceipt = ProtoBacked<
  z.infer<typeof CodePublicationReceiptSchema>,
  ProtoCodePublicationReceipt
>;
