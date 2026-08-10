import { describe, expect, it } from "vitest";
import { HookConfigSchema, HookTypeSchema, WebhookConfigSchema } from "../../extensions/hook.js";

const endpointToken = "a".repeat(32);

describe("HookConfigSchema", () => {
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

describe("WebhookConfigSchema", () => {
  it("accepts URL-safe capability tokens up to 128 characters", () => {
    expect(WebhookConfigSchema.parse({ endpointToken: "a".repeat(128) })).toEqual({
      endpointToken: "a".repeat(128),
    });
  });
});
