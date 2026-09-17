import { describe, it } from "vitest";
import type { GetHooksOutput, HookConfig } from "../../extensions/hook.js";
import type {
  OAuthFlowHookInput,
  OAuthFlowHookResult,
  HookExtensionInterface,
  OAuthExtensionInterface,
} from "../../index.js";

describe("OAuth flow hook exported types", () => {
  it("exports a strict result union without adding required extension methods", () => {
    const input: OAuthFlowHookInput = {
      flowId: "flow-1",
      resumeUrl: "https://app-store.example/resume",
      expiresAt: "2026-09-17T12:00:00Z",
    };
    const proceed: OAuthFlowHookResult = { type: "continue" };
    const redirect: OAuthFlowHookResult = {
      type: "redirect",
      url: "https://provider.example/install",
    };
    // @ts-expect-error A continue result cannot contain a redirect URL.
    const invalid: OAuthFlowHookResult = { type: "continue", url: "https://provider.example" };
    // @ts-expect-error A redirect result requires its URL.
    const missing: OAuthFlowHookResult = { type: "redirect" };
    const hooks: HookExtensionInterface = { getHooks: async () => ({ hooks: [] }) };
    type ExistingOAuthMethods = Pick<
      OAuthExtensionInterface,
      "getAuthConfig" | "validateCredentials"
    >;
    const unchanged: keyof OAuthExtensionInterface extends keyof ExistingOAuthMethods
      ? true
      : false = true;
    void input;
    void proceed;
    void redirect;
    void invalid;
    void missing;
    void hooks;
    void unchanged;
  });
});

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
