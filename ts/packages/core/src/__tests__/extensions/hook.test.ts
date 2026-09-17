import { describe, expect, it } from "vitest";
import {
  HookConfigSchema,
  HookTypeSchema,
  OAuthFlowHookInputSchema,
  OAuthFlowHookResultSchema,
  TeamChatMessageCreatedHookInputSchema,
  WebhookConfigSchema,
} from "../../extensions/hook.js";

const endpointToken = "a".repeat(32);

describe("HookConfigSchema", () => {
  it.each(["oauth.beforeAuthorization", "oauth.afterAuthorization"] as const)(
    "accepts optional %s flow hooks with exact redirect origins",
    (type) => {
      const hook = {
        type,
        actionFunctionName: "hooks.oauth.flow",
        redirectOrigins: ["https://provider.example", "https://settings.example:8443"],
      };
      expect(HookConfigSchema.parse(hook)).toEqual(hook);
      expect(HookConfigSchema.parse({ ...hook, redirectOrigins: [] })).toEqual({
        ...hook,
        redirectOrigins: [],
      });
      // Go proto JSON omits empty repeated fields.
      expect(HookConfigSchema.parse({ type, actionFunctionName: hook.actionFunctionName })).toEqual(
        {
          type,
          actionFunctionName: hook.actionFunctionName,
          redirectOrigins: [],
        }
      );
    }
  );

  it.each([
    "http://provider.example",
    "https://*.example.com",
    "https://user:secret@provider.example",
    "https://provider.example/",
    "https://provider.example/path",
    "https://provider.example?next=1",
    "https://provider.example#fragment",
    "https://provider.example\\path",
    " https://provider.example",
    "https://PROVIDER.example",
    "https://provider.example:443",
  ])("rejects a non-origin redirect allowlist entry: %s", (origin) => {
    expect(
      HookConfigSchema.safeParse({
        type: "oauth.beforeAuthorization",
        actionFunctionName: "hooks.oauth.flow",
        redirectOrigins: [origin],
      }).success
    ).toBe(false);
  });

  it("rejects null redirectOrigins and origins on other hook types", () => {
    expect(
      HookConfigSchema.safeParse({
        type: "oauth.beforeAuthorization",
        actionFunctionName: "hooks.oauth.flow",
        redirectOrigins: null,
      }).success
    ).toBe(false);
    expect(
      HookConfigSchema.safeParse({
        type: "oauth.connected",
        actionFunctionName: "hooks.oauth.connected",
        redirectOrigins: [],
      }).success
    ).toBe(false);
  });
  it.each(["oauth.connected", "oauth.disconnected"] as const)(
    "accepts %s lifecycle hooks with an action function and system version",
    (type) => {
      expect(
        HookConfigSchema.parse({
          type,
          actionFunctionName: "hooks.oauth.lifecycle",
          systemVersion: "v1",
        })
      ).toEqual({
        type,
        actionFunctionName: "hooks.oauth.lifecycle",
        systemVersion: "v1",
      });
    }
  );

  it.each([
    ["oauth.connected", { targetId: "provider.events" }],
    ["oauth.connected", { webhook: { endpointToken } }],
    ["oauth.disconnected", { targetId: "provider.events" }],
    ["oauth.disconnected", { webhook: { endpointToken } }],
  ] as const)("rejects forbidden OAuth lifecycle settings for %s: %j", (type, extra) => {
    expect(() =>
      HookConfigSchema.parse({
        type,
        actionFunctionName: "hooks.oauth.lifecycle",
        ...extra,
      })
    ).toThrow();
  });

  it("includes the exact OAuth lifecycle hook type literals", () => {
    expect(HookTypeSchema.options).toEqual(
      expect.arrayContaining(["oauth.connected", "oauth.disconnected"])
    );
  });

  it("accepts a teamChat.messageCreated hook without target metadata", () => {
    expect(
      HookConfigSchema.parse({
        type: "teamChat.messageCreated",
        actionFunctionName: "linear.teamChatMessageCreated.handle",
      })
    ).toEqual({
      type: "teamChat.messageCreated",
      actionFunctionName: "linear.teamChatMessageCreated.handle",
    });
  });

  it("rejects target metadata on teamChat.messageCreated hooks", () => {
    expect(() =>
      HookConfigSchema.parse({
        type: "teamChat.messageCreated",
        targetId: "linear.comments",
        actionFunctionName: "linear.teamChatMessageCreated.handle",
      })
    ).toThrow();
  });

  it("accepts an app-level public webhook hook", () => {
    expect(
      HookConfigSchema.parse({
        type: "webhook.received",
        targetId: "bcart.orders",
        actionFunctionName: "hooks.bcart.receive",
        systemVersion: "v1",
        webhook: {
          endpointToken,
        },
      })
    ).toEqual({
      type: "webhook.received",
      targetId: "bcart.orders",
      actionFunctionName: "hooks.bcart.receive",
      systemVersion: "v1",
      webhook: {
        endpointToken,
      },
    });
  });

  it("accepts a manager-scoped public webhook hook without an endpoint token", () => {
    expect(
      HookConfigSchema.parse({
        type: "webhook.received",
        targetId: "provider.events",
        actionFunctionName: "hooks.provider.receive",
        webhook: {
          executionScope: "manager",
        },
      })
    ).toEqual({
      type: "webhook.received",
      targetId: "provider.events",
      actionFunctionName: "hooks.provider.receive",
      webhook: {
        executionScope: "manager",
      },
    });
  });

  it("rejects endpoint tokens on manager-scoped webhook hooks", () => {
    expect(() =>
      HookConfigSchema.parse({
        type: "webhook.received",
        targetId: "provider.events",
        actionFunctionName: "hooks.provider.receive",
        webhook: {
          executionScope: "manager",
          endpointToken,
        },
      })
    ).toThrow();
  });

  it("rejects invalid webhook target IDs", () => {
    expect(() =>
      HookConfigSchema.parse({
        type: "webhook.received",
        targetId: "invalid target",
        actionFunctionName: "hooks.receive",
        webhook: { endpointToken },
      })
    ).toThrow();
  });

  it("rejects short webhook endpoint tokens", () => {
    expect(() =>
      HookConfigSchema.parse({
        type: "webhook.received",
        targetId: "valid.target",
        actionFunctionName: "hooks.receive",
        webhook: { endpointToken: "too-short" },
      })
    ).toThrow();
  });

  it("does not allow webhook settings on lifecycle hooks", () => {
    expect(() =>
      HookConfigSchema.parse({
        type: "app.installed",
        actionFunctionName: "hooks.lifecycle.install",
        webhook: {
          endpointToken,
        },
      })
    ).toThrow();
  });
});

describe("OAuth flow hook contracts", () => {
  it("accepts the platform flow envelope without introducing a settings URL", () => {
    const input = {
      flowId: "flow-1",
      resumeUrl: "https://app-store.example/oauth/resume?flowId=flow-1",
      expiresAt: "2026-09-17T12:30:00Z",
    };
    expect(OAuthFlowHookInputSchema.parse(input)).toEqual(input);
    expect(
      OAuthFlowHookInputSchema.safeParse({ ...input, settingsUrl: "https://desk.example" }).success
    ).toBe(false);
    expect(OAuthFlowHookInputSchema.safeParse({ ...input, expiresAt: "tomorrow" }).success).toBe(
      false
    );
  });

  it("accepts exactly continue or redirect results", () => {
    expect(OAuthFlowHookResultSchema.parse({ type: "continue" })).toEqual({ type: "continue" });
    expect(
      OAuthFlowHookResultSchema.parse({
        type: "redirect",
        url: "https://provider.example/install?state=opaque",
      })
    ).toEqual({
      type: "redirect",
      url: "https://provider.example/install?state=opaque",
    });
  });

  it.each([
    { type: "continue", url: "https://provider.example" },
    { type: "continue", completed: true },
    { type: "redirect" },
    { type: "redirect", url: "http://provider.example" },
    { type: "redirect", url: "https://user:secret@provider.example" },
    { type: "redirect", url: "/relative" },
    { type: "redirect", url: "https://provider.example", token: "secret" },
    { type: "completed" },
  ])("rejects malformed flow results: %j", (result) => {
    expect(OAuthFlowHookResultSchema.safeParse(result).success).toBe(false);
  });
});

describe("WebhookConfigSchema", () => {
  it("accepts URL-safe capability tokens up to 128 characters", () => {
    expect(WebhookConfigSchema.parse({ endpointToken: "a".repeat(128) })).toEqual({
      endpointToken: "a".repeat(128),
    });
  });
});

describe("TeamChatMessageCreatedHookInputSchema", () => {
  it("keeps the complete Message snapshot", () => {
    const input = {
      eventId: "event-1",
      channelId: "channel-1",
      groupId: "group-1",
      messageId: "message-1",
      occurredAt: "2026-09-09T00:00:00Z",
      snapshot: {
        id: "message-1",
        threadId: "root-message-1",
        personType: "manager",
        personId: "manager-1",
        files: [{ id: "file-1" }],
        reactions: [{ emoji: "thumbsup" }],
      },
    };

    expect(TeamChatMessageCreatedHookInputSchema.parse(input)).toEqual(input);
  });
});
