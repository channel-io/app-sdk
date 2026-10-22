import { describe, expect, it } from "vitest";
import {
  AppPersonInvokedHookInputSchema,
  AppPersonInvokedHookResultSchema,
  GetHooksOutputSchema,
  type AppPersonInvokedHookInput,
  type AppPersonInvokedHookResult,
  type HookConfig,
} from "../../index.js";

const input: AppPersonInvokedHookInput = {
  type: "appPerson.invoked",
  version: 1,
  eventId: "event-1",
  invocationId: "invocation-1",
  requestId: "request-1",
  sourceEventId: "source-1",
  channelId: "channel-1",
  chatType: "group",
  chatId: "group-1",
  sourceMessageId: "message-1",
  sourceContentRevision: "9007199254740993",
  requestedAt: "2026-10-22T00:00:00Z",
  appId: "app-1",
  appPersonId: "person-1",
  installationId: "installation-1",
  invokingManagerId: "manager-1",
  credentialScope: "channel",
  prompt: "",
};

describe("appPerson.invoked", () => {
  it("registers an ordinary app-level handler without adding extension methods", () => {
    const hook: HookConfig = {
      type: "appPerson.invoked",
      actionFunctionName: "hooks.onInvocation",
      systemVersion: "v1",
    };
    expect(GetHooksOutputSchema.parse({ hooks: [hook] }).hooks).toEqual([hook]);
    for (const extra of [
      { targetId: "target" },
      { authScope: "manager" },
      { webhook: { executionScope: "manager" } },
      { redirectOrigins: [] },
      { display: {} },
    ]) {
      expect(GetHooksOutputSchema.safeParse({ hooks: [{ ...hook, ...extra }] }).success).toBe(
        false
      );
    }
    const invalid: HookConfig = {
      type: "appPerson.invoked",
      actionFunctionName: "hooks.onInvocation",
      // @ts-expect-error Invocation hooks do not declare a target.
      targetId: "target",
    };
    void invalid;
  });

  it("accepts exact platform wire data, optional threads and empty prompts", () => {
    const wire = JSON.stringify(input);
    expect(AppPersonInvokedHookInputSchema.parse(JSON.parse(wire))).toEqual(input);
    expect(
      AppPersonInvokedHookInputSchema.parse({
        ...input,
        threadId: "thread-1",
      }).threadId
    ).toBe("thread-1");
    expect(
      AppPersonInvokedHookInputSchema.parse({
        ...input,
        chatType: "directChat",
        credentialScope: "manager",
      }).threadId
    ).toBeUndefined();
    expect(
      AppPersonInvokedHookInputSchema.safeParse({
        ...input,
        chatType: "directChat",
        credentialScope: "manager",
        threadId: "thread-1",
      }).success
    ).toBe(false);
  });

  it("accepts a UserChat private-note invocation with channel credentials and no thread", () => {
    const userChat: AppPersonInvokedHookInput = {
      ...input,
      chatType: "userChat",
      chatId: "user-chat-1",
      credentialScope: "channel",
      sourceContentRevision: "1",
    };
    expect(AppPersonInvokedHookInputSchema.parse(userChat)).toEqual(userChat);
    expect(AppPersonInvokedHookInputSchema.parse({ ...userChat, threadId: null })).toEqual({
      ...userChat,
      threadId: undefined,
    });
    expect(
      AppPersonInvokedHookInputSchema.parse({
        ...userChat,
        sourceContentRevision: "9223372036854775807",
      }).sourceContentRevision
    ).toBe("9223372036854775807");
    for (const patch of [
      { credentialScope: "manager" },
      { threadId: "thread-1" },
      { sourceContentRevision: "0" },
      { sourceContentRevision: "01" },
      { sourceContentRevision: 9007199254740992 },
    ]) {
      expect(AppPersonInvokedHookInputSchema.safeParse({ ...userChat, ...patch }).success).toBe(
        false
      );
    }
  });

  it.each(["1", "9007199254740993", "9223372036854775807"])(
    "preserves signed int64 revision %s without number conversion",
    (sourceContentRevision) => {
      const parsed = AppPersonInvokedHookInputSchema.parse({ ...input, sourceContentRevision });
      expect(parsed.sourceContentRevision).toBe(sourceContentRevision);
    }
  );

  it.each([0, "0", 9007199254740992, "-1", "01", "1.0", "9223372036854775808"])(
    "rejects noncanonical or unsafe revisions: %s",
    (sourceContentRevision) => {
      expect(
        AppPersonInvokedHookInputSchema.safeParse({ ...input, sourceContentRevision }).success
      ).toBe(false);
    }
  );

  it("rejects a scope mismatch, missing identity, unsupported version or extra fields", () => {
    for (const patch of [
      { credentialScope: "manager" },
      { chatType: "directChat" },
      { invokingManagerId: "" },
      { appId: "" },
      { version: 2 },
      { type: "teamChat.messageCreated" },
      { requestedAt: "yesterday" },
      { targets: ["app-1", "app-2"] },
    ]) {
      expect(AppPersonInvokedHookInputSchema.safeParse({ ...input, ...patch }).success).toBe(false);
    }
    const { installationId: omitted, ...missingInstallation } = input;
    void omitted;
    expect(AppPersonInvokedHookInputSchema.safeParse(missingInstallation).success).toBe(false);
  });

  it("accepts only a terminal acknowledgement without reply content", () => {
    for (const hookHandlingResult of ["succeeded", "skipped", "failed"] as const) {
      const result: AppPersonInvokedHookResult = { hookHandlingResult, terminal: true };
      expect(AppPersonInvokedHookResultSchema.parse(result)).toEqual(result);
      expect(
        AppPersonInvokedHookResultSchema.safeParse({ ...result, terminal: false }).success
      ).toBe(false);
      expect(
        AppPersonInvokedHookResultSchema.safeParse({ ...result, reply: "hello" }).success
      ).toBe(false);
    }
    expect(
      AppPersonInvokedHookResultSchema.safeParse({
        hookHandlingResult: "accepted",
        terminal: false,
      }).success
    ).toBe(false);
  });
});
