import { describe, expect, it } from "vitest";
import {
  WidgetConfigSchema,
  CustomTabConfigSchema,
  GetWidgetsOutputSchema,
  GetCustomTabsOutputSchema,
  HookConfigSchema,
  GetHooksOutputSchema,
  PollingPollerSchema,
  GetPollersOutputSchema,
  GetPollingTargetChannelsInputSchema,
  GetPollingTargetChannelsOutputSchema,
  GetPollingTargetManagersInputSchema,
  GetPollingTargetManagersOutputSchema,
} from "../../extensions/index.js";

describe("widget metadata schema", () => {
  it("accepts a wam widget with actionFunctionName", () => {
    const parsed = WidgetConfigSchema.parse({
      name: "quick_actions",
      scope: "front",
      actionFunctionName: "widgets.quickActions.action",
    });

    expect(parsed).toMatchObject({
      name: "quick_actions",
      scope: "front",
      actionFunctionName: "widgets.quickActions.action",
    });
  });

  it("rejects widgets without actionFunctionName", () => {
    expect(() =>
      WidgetConfigSchema.parse({
        name: "quick_actions",
        scope: "desk",
      })
    ).toThrow();
  });

  it("rejects snippet widgets outside desk scope", () => {
    expect(() =>
      WidgetConfigSchema.parse({
        name: "quick_actions",
        scope: "front",
        widgetType: "snippet",
        actionFunctionName: "widgets.quickActions.action",
      })
    ).toThrow();
  });

  it("accepts metadata response with widgets array", () => {
    const parsed = GetWidgetsOutputSchema.parse({
      widgets: [
        {
          name: "quick_actions",
          scope: "desk",
          widgetType: "wam",
          actionFunctionName: "widgets.quickActions.action",
        },
      ],
    });

    expect(parsed.widgets).toHaveLength(1);
  });
});

describe("custom tab metadata schema", () => {
  it("requires actionFunctionName", () => {
    const parsed = CustomTabConfigSchema.parse({
      name: "analytics",
      actionFunctionName: "customtabs.analytics.action",
      nameI18nMap: {
        ko: { name: "분석" },
      },
    });

    expect(parsed).toMatchObject({
      name: "analytics",
      actionFunctionName: "customtabs.analytics.action",
    });
  });

  it("accepts metadata response with customTabs array", () => {
    const parsed = GetCustomTabsOutputSchema.parse({
      customTabs: [
        {
          name: "analytics",
          actionFunctionName: "customtabs.analytics.action",
        },
      ],
    });

    expect(parsed.customTabs).toHaveLength(1);
  });
});

describe("hook metadata schema", () => {
  it("accepts app hooks without targetId", () => {
    const parsed = HookConfigSchema.parse({
      type: "app.installed",
      actionFunctionName: "hooks.lifecycle.onAppInstalled",
    });

    expect(parsed).toMatchObject({
      type: "app.installed",
      actionFunctionName: "hooks.lifecycle.onAppInstalled",
    });
  });

  it("requires targetId for widget hooks", () => {
    expect(() =>
      HookConfigSchema.parse({
        type: "widget.installed",
        actionFunctionName: "hooks.widgets.onInstalled",
      })
    ).toThrow();
  });

  it("rejects unexpected targetId for app hooks", () => {
    expect(() =>
      HookConfigSchema.parse({
        type: "command.toggle",
        targetId: "quick_actions",
        actionFunctionName: "hooks.commands.onToggle",
      })
    ).toThrow();
  });

  it.each(["config.saved", "config.deleted"] as const)(
    "accepts %s hooks without targetId",
    (type) => {
      const parsed = HookConfigSchema.parse({
        type,
        actionFunctionName: `hooks.config.${type === "config.saved" ? "onSaved" : "onDeleted"}`,
      });

      expect(parsed.type).toBe(type);
    }
  );

  it("rejects unexpected targetId for config hooks", () => {
    expect(() =>
      HookConfigSchema.parse({
        type: "config.deleted",
        targetId: "channel",
        actionFunctionName: "hooks.config.onDeleted",
      })
    ).toThrow();
  });

  it("accepts metadata response with hooks array", () => {
    const parsed = GetHooksOutputSchema.parse({
      hooks: [
        {
          type: "app.uninstalled",
          actionFunctionName: "hooks.lifecycle.onAppUninstalled",
        },
        {
          type: "config.deleted",
          actionFunctionName: "hooks.config.onDeleted",
        },
        {
          type: "widget.installed",
          targetId: "quick_actions",
          actionFunctionName: "hooks.widgets.onQuickActionsInstalled",
        },
      ],
    });

    expect(parsed.hooks).toHaveLength(3);
  });
});

describe("polling metadata schema", () => {
  it("accepts polling handler metadata", () => {
    const parsed = PollingPollerSchema.parse({
      functionName: "extension.polling.poller.pollQnAs",
      intervalSeconds: 900,
      timeoutSeconds: 30,
      maxConcurrency: 5,
      rps: 1,
      executionScope: "manager",
    });

    expect(parsed).toMatchObject({
      functionName: "extension.polling.poller.pollQnAs",
      intervalSeconds: 900,
      executionScope: "manager",
    });
  });

  it("rejects unknown polling execution scopes", () => {
    expect(() =>
      PollingPollerSchema.parse({
        functionName: "extension.polling.poller.pollQnAs",
        intervalSeconds: 900,
        executionScope: "workspace",
      })
    ).toThrow();
  });

  it("rejects invalid polling handler limits", () => {
    expect(() =>
      PollingPollerSchema.parse({
        functionName: "extension.polling.poller.pollQnAs",
        intervalSeconds: 0,
      })
    ).toThrow();
  });

  it("accepts polling metadata response with pollers array", () => {
    const parsed = GetPollersOutputSchema.parse({
      pollers: [
        {
          functionName: "extension.polling.poller.pollQnAs",
          intervalSeconds: 900,
        },
      ],
    });

    expect(parsed.pollers).toHaveLength(1);
  });

  it("accepts polling target channel paging input and output", () => {
    expect(
      GetPollingTargetChannelsInputSchema.parse({
        functionName: "extension.polling.poller.pollQnAs",
        cursor: "channel-1",
        limit: 200,
      })
    ).toEqual({
      functionName: "extension.polling.poller.pollQnAs",
      cursor: "channel-1",
      limit: 200,
    });

    expect(
      GetPollingTargetChannelsOutputSchema.parse({
        channelIds: ["channel-2"],
        nextCursor: "channel-2",
        hasNextPage: true,
      })
    ).toEqual({
      channelIds: ["channel-2"],
      nextCursor: "channel-2",
      hasNextPage: true,
    });
  });

  it("rejects polling target responses that keep paging without a cursor", () => {
    expect(() =>
      GetPollingTargetChannelsOutputSchema.parse({
        channelIds: ["channel-2"],
        hasNextPage: true,
      })
    ).toThrow();
  });

  it("accepts manager target paging input and output", () => {
    expect(
      GetPollingTargetManagersInputSchema.parse({
        functionName: "extension.polling.poller.pollCalendars",
        limit: 200,
      })
    ).toEqual({
      functionName: "extension.polling.poller.pollCalendars",
      limit: 200,
    });

    expect(
      GetPollingTargetManagersOutputSchema.parse({
        targets: [{ channelId: "channel-1", managerId: "manager-1" }],
      })
    ).toEqual({
      targets: [{ channelId: "channel-1", managerId: "manager-1" }],
    });
  });

  it("rejects manager target responses with empty IDs or a missing next cursor", () => {
    expect(() =>
      GetPollingTargetManagersOutputSchema.parse({
        targets: [{ channelId: "channel-1", managerId: "" }],
      })
    ).toThrow();
    expect(() =>
      GetPollingTargetManagersOutputSchema.parse({
        targets: [],
        hasNextPage: true,
      })
    ).toThrow();
  });

  it("rejects empty polling target cursors", () => {
    expect(() =>
      GetPollingTargetChannelsInputSchema.parse({
        functionName: "extension.polling.poller.pollQnAs",
        cursor: "",
        limit: 200,
      })
    ).toThrow();

    expect(() =>
      GetPollingTargetChannelsOutputSchema.parse({
        channelIds: ["channel-2"],
        nextCursor: "",
      })
    ).toThrow();
  });
});
