import { describe, expect, it } from "vitest";
import {
  InboxGetWritingTypesInputSchema,
  InboxGetWritingTypesOutputSchema,
  InboxOnMediumUserChatClosedInputSchema,
  createMessagingExtension,
  MessagingFunctionNames,
  MessagingMessageOptionSchema,
  MessagingUserChatStateSchema,
  MessagingWritingTypeSchema,
  OnMediumMessageCreatedInputSchema,
  PrebuiltBuildMediumTopicsOutputSchema,
} from "../../extensions/index.js";
import type { Context } from "../../types/context.js";

describe("messaging extension schemas", () => {
  it("parses inbox message-created input with required fields and enums", () => {
    const parsed = OnMediumMessageCreatedInputSchema.parse({
      userChat: {
        id: "user-chat-1",
        channelId: "channel-1",
        userId: "user-1",
        mediumType: "app",
        mediumTopicKey: "topic-1",
        state: "USER_CHAT_STATE_OPENED",
      },
      message: {
        id: "message-1",
        channelId: "channel-1",
        chatType: "userChat",
        chatId: "user-chat-1",
        personType: "user",
        personId: "user-1",
        language: "ko",
        createdAt: "2026-04-09T11:47:05Z",
        options: ["MESSAGE_OPTION_PRIVATE"],
        writingType: "WRITING_TYPE_STANDARD",
      },
    });

    expect(parsed.message.options).toEqual(["MESSAGE_OPTION_PRIVATE"]);
  });

  it("uses the runtime writingTypeMap key for inbox getWritingTypes output", () => {
    const parsed = InboxGetWritingTypesOutputSchema.parse({
      writingTypeMap: {
        standard: { state: "available" },
      },
    });

    expect(parsed.writingTypeMap.standard?.state).toBe("available");
  });

  it("accepts protobuf JSON int64 and uint64 numeric strings in messaging inputs", () => {
    const parsed = InboxGetWritingTypesInputSchema.parse({
      userChat: {
        id: "user-chat-1",
        channelId: "channel-1",
        userId: "user-1",
        mediumType: "app",
        mediumTopicKey: "topic-1",
        version: "5",
        waitingTime: "518561293",
        avgReplyTime: "518561293",
        resolutionTime: "0",
        totalReplyTime: "518561293",
        operationWaitingTime: "0",
        operationAvgReplyTime: "0",
        operationResolutionTime: "0",
        operationTotalReplyTime: "0",
      },
    });

    expect(parsed.userChat.version).toBe("5");
    expect(parsed.userChat.waitingTime).toBe("518561293");
    expect(parsed.userChat.operationTotalReplyTime).toBe("0");
  });

  it("rejects negative numeric strings for non-negative messaging counters", () => {
    expect(() =>
      InboxGetWritingTypesInputSchema.parse({
        userChat: {
          id: "user-chat-1",
          channelId: "channel-1",
          userId: "user-1",
          mediumType: "app",
          mediumTopicKey: "topic-1",
          version: "5",
          waitingTime: "-1",
        },
      })
    ).toThrow();
  });

  it("parses inbox user-chat closed input", () => {
    const parsed = InboxOnMediumUserChatClosedInputSchema.parse({
      userChat: {
        id: "user-chat-1",
        channelId: "channel-1",
        userId: "user-1",
        mediumType: "app",
        mediumTopicKey: "topic-1",
        state: "USER_CHAT_STATE_CLOSED",
        closedAt: "2026-05-12T10:00:00Z",
      },
    });

    expect(parsed.userChat.state).toBe("USER_CHAT_STATE_CLOSED");
  });

  it("exports messaging function names as extension-relative names", () => {
    expect(MessagingFunctionNames.inbox.onMediumMessageCreated).toBe(
      "inbox.onMediumMessageCreated"
    );
    expect(MessagingFunctionNames.inbox.onMediumUserChatClosed).toBe(
      "inbox.onMediumUserChatClosed"
    );
    expect(MessagingFunctionNames.prebuilt.buildMediumTopics).toBe("prebuilt.buildMediumTopics");
  });

  it("defines message option enum values used by inbox native writes", () => {
    expect(MessagingMessageOptionSchema.parse("MESSAGE_OPTION_DO_NOT_UPDATE_DESK")).toBe(
      "MESSAGE_OPTION_DO_NOT_UPDATE_DESK"
    );
  });

  it("accepts dropwizard messaging enum values", () => {
    expect(MessagingWritingTypeSchema.parse("WRITING_TYPE_EMAIL")).toBe("WRITING_TYPE_EMAIL");
    expect(MessagingUserChatStateSchema.parse("USER_CHAT_STATE_INITIAL")).toBe(
      "USER_CHAT_STATE_INITIAL"
    );
    expect(MessagingUserChatStateSchema.parse("USER_CHAT_STATE_MISSED")).toBe(
      "USER_CHAT_STATE_MISSED"
    );
    expect(MessagingUserChatStateSchema.parse("USER_CHAT_STATE_QUEUED")).toBe(
      "USER_CHAT_STATE_QUEUED"
    );
  });

  it("parses prebuilt buildMediumTopics output", () => {
    const parsed = PrebuiltBuildMediumTopicsOutputSchema.parse({
      mediumTopicKey: "topic-1",
      mediumTopicLabels: ["Order", "123"],
      mediumProfile: {
        mediumName: "Coupang",
        mediumSenderId: "sender-1",
        mediumSenderName: "Customer",
      },
    });

    expect(parsed.mediumProfile.mediumSenderId).toBe("sender-1");
  });

  it("builds schema-validated inbox and prebuilt function groups", async () => {
    const extension = createMessagingExtension({
      inbox: {
        onMediumMessageCreated: (_ctx, input) => ({
          sendResult: { sendState: input.message.id ?? "sent" },
        }),
        getWritingTypes: () => ({
          writingTypeMap: { standard: { state: "available" } },
        }),
      },
      prebuilt: {
        getDefaultOptions: () => ({ defaultOptions: {} }),
      },
    });

    expect(extension.name).toBe("messaging");
    expect(extension.systemVersion).toBe("v1");
    expect(Object.keys(extension.groups.inbox)).toEqual([
      "onMediumMessageCreated",
      "getWritingTypes",
    ]);
    expect(Object.keys(extension.groups.prebuilt)).toEqual(["getDefaultOptions"]);

    const result = await extension.groups.inbox.onMediumMessageCreated.handler({} as Context, {
      userChat: {
        id: "user-chat-1",
        channelId: "channel-1",
        userId: "user-1",
        mediumType: "app",
        mediumTopicKey: "topic-1",
      },
      message: {
        id: "message-1",
        channelId: "channel-1",
        chatType: "userChat",
        chatId: "user-chat-1",
        personType: "user",
        personId: "user-1",
        language: "en",
        createdAt: "2026-07-23T00:00:00Z",
      },
    });

    expect(result.sendResult.sendState).toBe("message-1");
  });
});
