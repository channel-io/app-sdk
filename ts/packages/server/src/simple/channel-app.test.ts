import "reflect-metadata";
import { describe, expect, it } from "vitest";
import { CodeSendInputInputSchema } from "@channel.io/app-sdk-core";
import { ChannelApp } from "./channel-app.js";

describe("simple API schema metadata", () => {
  it("retains the core converter's Unicode bounds and future-input policy", () => {
    const app = new ChannelApp({ appId: "test", appSecret: "test" }).function(
      "code.session.sendInput",
      CodeSendInputInputSchema,
      async () => ({ sessionKey: "s", accepted: true })
    );
    // Inspect the public module definition consumed by the Simple service.
    const provider = app
      .toModule()
      .providers?.find(
        (item) => typeof item === "object" && "useValue" in item && item.useValue instanceof Map
      );
    if (!provider || typeof provider !== "object" || !("useValue" in provider)) {
      throw new Error("Function registry provider is missing");
    }
    const functions = provider.useValue as Map<string, { inputJsonSchema: unknown }>;
    expect(functions.get("code.session.sendInput")?.inputJsonSchema).toMatchObject({
      additionalProperties: true,
      properties: { sessionKey: { maxLength: 200 }, text: { maxLength: 32768 } },
    });
  });
});
