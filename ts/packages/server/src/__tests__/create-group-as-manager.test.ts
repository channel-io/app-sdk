import { afterEach, describe, expect, expectTypeOf, it, vi } from "vitest";
import type {
  NativeCreateGroupAsManagerParams,
  NativeCreateGroupAsManagerResult,
  NativeFunctionParams,
  NativeFunctionResult,
  NativeGroup,
} from "@channel.io/app-sdk-core";
import type { CreateGroupAsManagerRequest, CreateGroupAsManagerResult } from "../index.js";
import { NativeFunctionClient } from "../native/client.js";

describe("createGroupAsManager", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("sends only channelId and title with the supplied manager-context token", async () => {
    const fetch = vi
      .fn()
      .mockResolvedValue(new Response(JSON.stringify({ result: { group: { id: "group-1" } } })));
    vi.stubGlobal("fetch", fetch);
    const client = new NativeFunctionClient({ appStoreUrl: "https://app-store.example.com" });

    const result = await client.createProxyApi("manager-context-token").createGroupAsManager({
      channelId: "channel-1",
      title: "Support",
    });

    expectTypeOf<NativeCreateGroupAsManagerParams>().toEqualTypeOf<{
      channelId: string;
      title: string;
    }>();
    expectTypeOf<NativeCreateGroupAsManagerResult>().toEqualTypeOf<{ group: NativeGroup }>();
    expectTypeOf<CreateGroupAsManagerRequest>().toEqualTypeOf<NativeCreateGroupAsManagerParams>();
    expectTypeOf<CreateGroupAsManagerResult>().toEqualTypeOf<NativeCreateGroupAsManagerResult>();
    expectTypeOf<
      NativeFunctionParams<"createGroupAsManager">
    >().toEqualTypeOf<NativeCreateGroupAsManagerParams>();
    expectTypeOf<
      NativeFunctionResult<"createGroupAsManager">
    >().toEqualTypeOf<NativeCreateGroupAsManagerResult>();
    expectTypeOf(result).toEqualTypeOf<NativeCreateGroupAsManagerResult>();
    expect(fetch).toHaveBeenCalledOnce();
    const [url, init] = fetch.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("https://app-store.example.com/general/v1/native/functions");
    expect(init.method).toBe("PUT");
    expect(init.headers).toMatchObject({ "x-access-token": "manager-context-token" });
    expect(JSON.parse(init.body as string)).toEqual({
      method: "createGroupAsManager",
      params: { channelId: "channel-1", title: "Support" },
    });
    expect(result).toEqual({ group: { id: "group-1" } });
  });

  it.each(["duplicate title", "unknown outcome"])(
    "propagates %s without retry or lookup",
    async (failure) => {
      const fetch = vi.fn();
      if (failure === "duplicate title") {
        fetch.mockResolvedValue(new Response("Duplicate group title", { status: 409 }));
      } else {
        fetch.mockRejectedValue(new Error("Connection closed after request"));
      }
      vi.stubGlobal("fetch", fetch);
      const api = new NativeFunctionClient().createProxyApi("manager-context-token");

      await expect(
        api.createGroupAsManager({ channelId: "channel-1", title: "Support" })
      ).rejects.toThrow(failure === "duplicate title" ? "409" : "Connection closed after request");
      expect(fetch).toHaveBeenCalledOnce();
    }
  );
});
