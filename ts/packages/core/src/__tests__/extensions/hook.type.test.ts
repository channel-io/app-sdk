import { describe, it } from "vitest";
import type { GetHooksOutput, HookConfig } from "../../extensions/hook.js";

describe("OAuth lifecycle Hook exported types", () => {
  it("rejects forbidden fields in direct and nested lifecycle hook declarations", () => {
    const connectedWithTargetId: HookConfig = {
      type: "oauth.connected",
      actionFunctionName: "hooks.oauth.connected",
      // @ts-expect-error OAuth lifecycle hooks must not declare targetId.
      targetId: "provider.events",
    };

    const disconnectedWithWebhook: HookConfig = {
      type: "oauth.disconnected",
      actionFunctionName: "hooks.oauth.disconnected",
      // @ts-expect-error OAuth lifecycle hooks must not declare webhook metadata.
      webhook: { endpointToken: "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa" },
    };

    const outputWithConnectedTargetId: GetHooksOutput = {
      hooks: [
        {
          type: "oauth.connected",
          actionFunctionName: "hooks.oauth.connected",
          // @ts-expect-error Nested OAuth lifecycle hooks must not declare targetId.
          targetId: "provider.events",
        },
      ],
    };

    const outputWithDisconnectedWebhook: GetHooksOutput = {
      hooks: [
        {
          type: "oauth.disconnected",
          actionFunctionName: "hooks.oauth.disconnected",
          // @ts-expect-error Nested OAuth lifecycle hooks must not declare webhook metadata.
          webhook: { endpointToken: "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa" },
        },
      ],
    };

    void connectedWithTargetId;
    void disconnectedWithWebhook;
    void outputWithConnectedTargetId;
    void outputWithDisconnectedWebhook;
  });
});
