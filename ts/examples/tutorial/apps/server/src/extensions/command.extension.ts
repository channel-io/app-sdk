/* eslint-disable @typescript-eslint/require-await */
import { z } from "zod";
import {
  Extension,
  Func,
  Description,
  InputSchema,
  OutputSchema,
  Ctx,
  Input,
  GetCommandsOutputSchema,
  CommandResultSchema,
  NativeFunctionClient,
} from "@channel.io/app-sdk-server";
import type { Context } from "@channel.io/app-sdk-server";

const GetCommandsInput = z.object({});

const CommandActionInput = z.object({
  chat: z.object({
    type: z.string(),
    id: z.string(),
  }),
  trigger: z.object({
    type: z.string(),
    attributes: z.record(z.string(), z.string()),
  }),
  input: z.record(z.string(), z.unknown()),
  language: z.string(),
});

const SendMessageInput = z.object({
  userChatId: z.string(),
  senderType: z.enum(["manager", "bot"]),
});

const SendMessageOutput = z.object({
  success: z.boolean(),
  messageId: z.string().optional(),
});

/**
 * Tutorial command extension
 *
 * /tutorial 커맨드를 데스크에 등록합니다.
 * 커맨드 실행 시 WAM이 열리고, WAM에서 버튼을 누르면
 * 현재 상담에 매니저/봇 이름으로 테스트 메시지를 전송합니다.
 */
@Extension({ name: "command", systemVersion: "v1" })
export class CommandExtension {
  @Func("metadata.getCommands")
  @Description("Return the tutorial command definition")
  @InputSchema(GetCommandsInput)
  @OutputSchema(GetCommandsOutputSchema)
  async getCommands(): Promise<z.infer<typeof GetCommandsOutputSchema>> {
    return {
      commands: [
        {
          name: "tutorial",
          description: "Open the tutorial message panel",
          scope: "desk",
          actionFunctionName: "extension.command.command.execute",
          alfMode: "disable",
        },
      ],
    };
  }

  @Func("command.execute")
  @Description("Execute the /tutorial command — opens a WAM panel")
  @InputSchema(CommandActionInput)
  @OutputSchema(CommandResultSchema)
  async execute(
    @Ctx() ctx: Context,
    @Input() params: z.infer<typeof CommandActionInput>
  ): Promise<z.infer<typeof CommandResultSchema>> {
    const appId = process.env.APP_ID ?? (ctx.appId as string | undefined) ?? "";

    console.log("[Tutorial] Command executed:", {
      channelId: ctx.channel.id,
      callerId: ctx.caller.id,
      chatId: params.chat.id,
      chatType: params.chat.type,
    });

    return {
      type: "wam",
      attributes: {
        appId,
        name: "tutorial",
        wamArgs: {
          userChatId: params.chat.id,
          chatType: params.chat.type,
        },
      },
    };
  }

  @Func("message.send")
  @Description("Send a test message to the current userChat as manager or bot")
  @InputSchema(SendMessageInput)
  @OutputSchema(SendMessageOutput)
  async sendMessage(
    @Ctx() ctx: Context,
    @Input() params: z.infer<typeof SendMessageInput>
  ): Promise<z.infer<typeof SendMessageOutput>> {
    const appSecret = process.env.APP_SECRET ?? "";
    const nativeClient = new NativeFunctionClient({ debug: true });

    const { accessToken } = await nativeClient.issueToken(appSecret, {
      channelId: ctx.channel.id,
    });
    const api = nativeClient.createProxyApi(accessToken);

    if (params.senderType === "manager") {
      const managerId = ctx.caller.id ?? "";
      const result = await api.writeUserChatMessageAsManager({
        channelId: ctx.channel.id,
        userChatId: params.userChatId,
        dto: {
          plainText: "👋 매니저 테스트 메시지입니다! (Tutorial App)",
          managerId,
        },
      });
      return { success: true, messageId: result.message.id };
    } else {
      const result = await api.writeUserChatMessage({
        channelId: ctx.channel.id,
        userChatId: params.userChatId,
        dto: {
          plainText: "🤖 봇 테스트 메시지입니다! (Tutorial App)",
          botName: "Tutorial Bot",
        },
      });
      return { success: true, messageId: result.message.id };
    }
  }
}
