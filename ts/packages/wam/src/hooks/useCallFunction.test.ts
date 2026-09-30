// @vitest-environment jsdom

import { act, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, expectTypeOf, it, vi } from "vitest";
import type { CallFunctionArgs, OAuthTargetAuthScope } from "../types/wam.js";
import { useCallFunction, type UseCallFunctionOptions } from "./useCallFunction.js";

afterEach(() => {
  vi.restoreAllMocks();
  delete window.ChannelIOWam;
});

describe("useCallFunction", () => {
  it("exposes only concrete OAuth credential target scopes", () => {
    expectTypeOf<OAuthTargetAuthScope>().toEqualTypeOf<"channel" | "manager">();
    expectTypeOf<CallFunctionArgs["targetAuthScope"]>().toEqualTypeOf<
      "channel" | "manager" | undefined
    >();
    expectTypeOf<UseCallFunctionOptions["targetAuthScope"]>().toEqualTypeOf<
      "channel" | "manager" | undefined
    >();
  });

  it("forwards the selected OAuth target scope", async () => {
    const callFunction = vi.fn().mockResolvedValue({ ok: true });
    window.ChannelIOWam = {
      getWamData: vi.fn(),
      setSize: vi.fn(),
      callFunction,
      callNativeFunction: vi.fn(),
      close: vi.fn(),
    };

    const { result } = renderHook(() =>
      useCallFunction<{ ok: boolean }>({
        appId: "spreadsheet-app",
        name: "mcp.tool.list_spreadsheets",
        targetAuthScope: "channel",
      })
    );

    await act(async () => {
      await result.current.call({});
    });

    expect(callFunction).toHaveBeenCalledWith({
      appId: "spreadsheet-app",
      name: "mcp.tool.list_spreadsheets",
      params: {},
      targetAuthScope: "channel",
    });
  });

  it("rebinds the call callback when the OAuth target scope changes", async () => {
    const callFunction = vi.fn().mockResolvedValue({ ok: true });
    window.ChannelIOWam = {
      getWamData: vi.fn(),
      setSize: vi.fn(),
      callFunction,
      callNativeFunction: vi.fn(),
      close: vi.fn(),
    };

    const { result, rerender } = renderHook(
      ({ targetAuthScope }: { targetAuthScope: OAuthTargetAuthScope }) =>
        useCallFunction({
          appId: "spreadsheet-app",
          name: "mcp.tool.list_spreadsheets",
          targetAuthScope,
        }),
      { initialProps: { targetAuthScope: "channel" as OAuthTargetAuthScope } }
    );

    const channelCall = result.current.call;
    rerender({ targetAuthScope: "manager" });
    expect(result.current.call).not.toBe(channelCall);

    await act(async () => {
      await result.current.call({});
    });
    expect(callFunction).toHaveBeenLastCalledWith(
      expect.objectContaining({ targetAuthScope: "manager" })
    );
  });
});
