import { describe, expectTypeOf, it } from "vitest";
import { useNativeFunction } from "./useNativeFunction.js";
import type { NativeGetUserResult } from "@channel.io/app-sdk-core";

describe("useNativeFunction types", () => {
  it("infers public native parameters and results while preserving explicit result types", () => {
    // Typechecked without invoking React hooks outside a renderer.
    function UserSettings() {
      const user = useNativeFunction({ name: "getUser" });
      expectTypeOf(user.call).parameter(0).toEqualTypeOf<{
        channelId: string;
        userId: string;
      }>();
      expectTypeOf(user.data).toEqualTypeOf<NativeGetUserResult | null>();
      void user.call({ channelId: "channel-1", userId: "user-1" });
      // @ts-expect-error The native function requires a channel and user.
      void user.call({});
      // @ts-expect-error The public lookup does not accept a caller identity.
      void user.call({ channelId: "channel-1", userId: "user-1", managerId: "other" });

      const custom = useNativeFunction<{ ok: boolean }>({ name: "customNative" });
      expectTypeOf(custom.data).toEqualTypeOf<{ ok: boolean } | null>();
      return null;
    }
    void UserSettings;
  });
});
