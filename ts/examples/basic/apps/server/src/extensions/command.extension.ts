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

/**
 * Basic command extension example
 *
 * AppStore discovers commands via `extension.command.metadata.getCommands`.
 * Each command can then point at any app function, including one inside this
 * extension such as `extension.command.command.execute`.
 */
@Extension({ name: "command", systemVersion: "v1" })
export class CommandExtension {
  @Func("metadata.getCommands")
  @Description("Return command definitions for AppStore registration")
  @InputSchema(GetCommandsInput)
  @OutputSchema(GetCommandsOutputSchema)
  async getCommands(): Promise<z.infer<typeof GetCommandsOutputSchema>> {
    return {
      commands: [
        {
          name: "hello",
          description: "Say hello from the example app",
          scope: "desk",
          actionFunctionName: "extension.command.command.execute",
          alfMode: "disable",
          paramDefinitions: [
            {
              name: "target",
              type: "string",
              required: false,
              description: "Who to greet",
            },
          ],
        },
      ],
    };
  }

  @Func("command.execute")
  @Description("Execute the hello example command")
  @InputSchema(CommandActionInput)
  @OutputSchema(CommandResultSchema)
  async execute(
    @Ctx() ctx: Context,
    @Input() params: z.infer<typeof CommandActionInput>
  ): Promise<z.infer<typeof CommandResultSchema>> {
    const target =
      typeof params.input.target === "string" && params.input.target.trim() !== ""
        ? params.input.target
        : "world";

    console.log("[Command] Context:", {
      channelId: ctx.channel.id,
      callerId: ctx.caller.id,
      chatId: params.chat.id,
      triggerType: params.trigger.type,
    });

    return {
      type: "text",
      attributes: {
        message: `Hello, ${target}!`,
      },
    };
  }
}
