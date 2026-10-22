import { describe, expect, it } from "vitest";
import {
  CodeSendInputInputSchema,
  CodeSessionSnapshotSchema,
  CodeSessionEventSchema,
  CodeSessionResultSchema,
  CodeInvocationContextSchema,
} from "../../extensions/code.js";
import { zodToJsonSchema } from "../../utils/zod-to-json-schema.js";
const now = "2026-10-22T00:00:00Z";
const snapshot = {
  sessionKey: "s",
  version: "1",
  status: "idle",
  pendingInputCount: 0,
  question: null,
  lastResult: null,
  artifacts: [],
  error: null,
  observation: { status: "current", observedAt: now },
  updatedAt: now,
};
describe("code session contract", () => {
  it("counts Unicode code points and rejects the same blank characters as wire schemas", () => {
    const sessionKey = "😀".repeat(200);
    expect(CodeSendInputInputSchema.parse({ sessionKey, text: "fix" }).sessionKey).toBe(sessionKey);
    expect(CodeInvocationContextSchema.parse({ idempotencyKey: sessionKey }).idempotencyKey).toBe(
      sessionKey
    );
    expect(
      CodeSendInputInputSchema.safeParse({ sessionKey: sessionKey + "😀", text: "fix" }).success
    ).toBe(false);
    const result = { text: "😀".repeat(8192), source: "adapter", recordedAt: now, limitations: [] };
    expect(CodeSessionResultSchema.safeParse(result).success).toBe(true);
    expect(CodeSessionResultSchema.safeParse({ ...result, text: result.text + "😀" }).success).toBe(
      false
    );
    for (const blank of ["\u00a0", "\u0085", "\u2003", "\ufeff", " \t\n"]) {
      expect(CodeSendInputInputSchema.safeParse({ sessionKey: "s", text: blank }).success).toBe(
        false
      );
      expect(CodeInvocationContextSchema.safeParse({ idempotencyKey: blank }).success).toBe(false);
    }
    const schema = zodToJsonSchema(CodeSessionResultSchema);
    expect((schema["properties"] as Record<string, unknown>)["text"]).toMatchObject({
      minLength: 1,
      maxLength: 8192,
    });
  });
  it("strips future input keys but enforces raw UTF-8 bytes before stripping", () => {
    expect(CodeSendInputInputSchema.parse({ sessionKey: "s", text: "fix", future: true })).toEqual({
      sessionKey: "s",
      text: "fix",
    });
    expect(
      CodeSendInputInputSchema.safeParse({
        sessionKey: "s",
        text: "fix",
        future: "가".repeat(90000),
      }).success
    ).toBe(false);
    expect(CodeSendInputInputSchema.safeParse({ sessionKey: " ", text: "fix" }).success).toBe(
      false
    );
  });
  it("requires state-specific evidence and explicit nullable output fields", () => {
    expect(CodeSessionSnapshotSchema.parse(snapshot)).toEqual(snapshot);
    expect(
      CodeSessionSnapshotSchema.safeParse({
        ...snapshot,
        status: "running",
        pendingInputCount: 2147483648,
      }).success
    ).toBe(false);
    for (const patch of [
      { status: "needs_input" },
      { status: "queued" },
      { status: "failed" },
      { status: "unavailable" },
      { pendingInputCount: 1 },
      { question: undefined },
      { version: "01" },
      { observation: { status: "current", observedAt: null } },
      { future: true },
    ]) {
      expect(CodeSessionSnapshotSchema.safeParse({ ...snapshot, ...patch }).success).toBe(false);
    }
    expect(
      CodeSessionSnapshotSchema.safeParse({
        ...snapshot,
        status: "needs_input",
        question: { text: "Approve?", source: "provider_message", answerVia: "provider_ui" },
      }).success
    ).toBe(false);
    expect(
      CodeSessionSnapshotSchema.safeParse({
        ...snapshot,
        status: "needs_input",
        question: {
          text: "Approve?",
          source: "provider_message",
          answerVia: "provider_ui",
          actionUrl: "https://example.com/approve",
        },
      }).success
    ).toBe(true);
  });
  it("checks event payload identity, decimal sequence and snapshot version/time equality", () => {
    const event = {
      sessionKey: "s",
      eventId: "e",
      sequence: "1",
      recordedAt: now,
      type: "session.updated",
      payload: snapshot,
    };
    expect(CodeSessionEventSchema.safeParse(event).success).toBe(true);
    for (const patch of [
      { sequence: "0" },
      { sequence: "2" },
      { sessionKey: "other" },
      { recordedAt: "2026-10-22T01:00:00Z" },
      { payload: { text: "wrong", source: "adapter" } },
    ])
      expect(CodeSessionEventSchema.safeParse({ ...event, ...patch }).success).toBe(false);
    expect(
      CodeSessionEventSchema.safeParse({
        ...event,
        type: "session.message",
        payload: { text: "Working", source: "adapter" },
      }).success
    ).toBe(true);
  });
});
