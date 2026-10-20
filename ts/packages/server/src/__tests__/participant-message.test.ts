import { afterEach, expect, expectTypeOf, it, vi } from "vitest";
import type { NativeFunctionParams } from "@channel.io/app-sdk-core";
import { NativeFunctionClient } from "../native/client.js";

afterEach(() => vi.unstubAllGlobals());

it("sends the participant, app and channel through the authenticated proxy without changing the receipt", async () => {
  const request = {
    channelId: "channel-1",
    appId: "app-1",
    userChatId: "chat-owned-by-another-user",
    dto: { userId: "participant-2", plainText: "Reply", requestId: "same-receipt" },
  } satisfies NativeFunctionParams<"writeUserChatMessageAsParticipant">;
  expectTypeOf<NativeFunctionParams<"writeUserChatMessageAsParticipant">>().toHaveProperty("appId");
  const result = { message: { id: "message-1", personId: "participant-2" } };
  const fetch = vi
    .fn()
    .mockResolvedValue(new Response(JSON.stringify({ result }), { status: 200 }));
  vi.stubGlobal("fetch", fetch);
  const client = new NativeFunctionClient({ appStoreUrl: "https://app-store.test" });
  await expect(
    client.createProxyApi("channel-app-token").writeUserChatMessageAsParticipant(request)
  ).resolves.toEqual(result);
  const [, init] = fetch.mock.calls[0] as [string, RequestInit];
  expect(JSON.parse(init.body as string)).toEqual({
    method: "writeUserChatMessageAsParticipant",
    params: request,
  });
  expect(init.headers).toMatchObject({ "x-access-token": "channel-app-token" });
});
