import { describe, expectTypeOf, it } from "vitest";
import { useNativeFunction } from "./useNativeFunction.js";
import type { NativeOAuthFlowResult } from "../index.js";

describe("useNativeFunction types", () => {
  it("infers OAuth flow parameters and results while preserving explicit result types", () => {
    // Typechecked as a component without invoking React hooks outside a renderer.
    function FlowSettings() {
      const resume = useNativeFunction({ name: "resumeOAuthFlow" });
      expectTypeOf(resume.call).parameter(0).toEqualTypeOf<{
        flowId: string;
        resumeNonce?: string | undefined;
      }>();
      expectTypeOf(resume.data).toEqualTypeOf<NativeOAuthFlowResult | null>();
      void resume.call({ flowId: "flow-1", resumeNonce: "nonce" });
      // @ts-expect-error The Native requires the opaque flow ID.
      void resume.call({});
      // @ts-expect-error Manager identity comes from the authenticated session.
      void resume.call({ flowId: "flow-1", managerId: "manager-2" });

      const custom = useNativeFunction<{ ok: boolean }>({ name: "customNative" });
      expectTypeOf(custom.data).toEqualTypeOf<{ ok: boolean } | null>();
      return null;
    }
    void FlowSettings;
  });
});
