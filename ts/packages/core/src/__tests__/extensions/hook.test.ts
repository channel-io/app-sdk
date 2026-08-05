import { describe, expect, it } from "vitest";
import { HookConfigSchema, WebhookConfigSchema } from "../../extensions/hook.js";

const endpointToken = "a".repeat(32);

describe("HookConfigSchema", () => {
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
