import { describe, expect, it } from "vitest";
import { GetPollersOutputSchema, PollingPollerSchema } from "./polling.js";
import { zodToJsonSchema } from "../utils/zod-to-json-schema.js";

describe("polling schedules", () => {
  it("preserves interval declarations and accepts several IDs for one function", () => {
    expect(PollingPollerSchema.parse({ functionName: "poll", intervalSeconds: 60 })).toEqual({
      functionName: "poll",
      intervalSeconds: 60,
    });
    expect(
      GetPollersOutputSchema.safeParse({
        pollers: [
          {
            pollerId: "morning",
            functionName: "poll",
            cronExpression: "0 9 * * *",
            timezone: "Asia/Seoul",
          },
          {
            pollerId: "evening",
            functionName: "poll",
            cronExpression: "0 18 * * *",
            timezone: "Asia/Seoul",
          },
        ],
      }).success
    ).toBe(true);
  });
  it("rejects ambiguous, incomplete or duplicate schedules", () => {
    for (const fields of [
      {},
      { intervalSeconds: 0 },
      { cronExpression: "0 9 * * *" },
      { intervalSeconds: 60, cronExpression: "0 9 * * *", timezone: "UTC" },
      { intervalSeconds: 60, timezone: "UTC" },
      { cronExpression: "@daily", timezone: "UTC" },
      { cronExpression: "0 0 9 * * *", timezone: "UTC" },
      { cronExpression: "0 9 * * *", timezone: "Local" },
      { cronExpression: "0 9 * * *", timezone: "" },
      { cronExpression: "0 9 * * *", timezone: "+09:00" },
      { cronExpression: "0 9 * * *", timezone: "-05:00" },
      { cronExpression: "0 9 * * *", timezone: "Asia/Missing" },
    ])
      expect(PollingPollerSchema.safeParse({ functionName: "poll", ...fields }).success).toBe(
        false
      );
    expect(
      GetPollersOutputSchema.safeParse({
        pollers: [
          { functionName: "poll", intervalSeconds: 60 },
          { pollerId: "poll", functionName: "other", intervalSeconds: 120 },
        ],
      }).success
    ).toBe(false);
  });
  it("accepts IANA links without a slash", () => {
    expect(
      PollingPollerSchema.safeParse({
        functionName: "poll",
        cronExpression: "0 9 * * *",
        timezone: "Japan",
      }).success
    ).toBe(true);
  });
  it("uses the server UTF-8 byte bound for multilingual IDs", () => {
    expect(
      PollingPollerSchema.safeParse({
        pollerId: "가".repeat(85),
        functionName: "poll",
        intervalSeconds: 60,
      }).success
    ).toBe(true);
    expect(
      PollingPollerSchema.safeParse({
        pollerId: "가".repeat(86),
        functionName: "poll",
        intervalSeconds: 60,
      }).success
    ).toBe(false);
    expect(
      PollingPollerSchema.safeParse({
        pollerId: "a".repeat(256),
        functionName: "poll",
        intervalSeconds: 60,
      }).success
    ).toBe(true);
  });
  it("exports both schedule alternatives in JSON Schema", () => {
    const schema = zodToJsonSchema(PollingPollerSchema);
    expect(schema).toHaveProperty("anyOf");
    expect(schema.anyOf).toHaveLength(2);
  });
});
