import { describe, expect, it } from "vitest";
import { VersionMismatchError } from "../nestjs/channel-app.service.js";
import { ChannelAppSimpleService } from "./channel-app.js";

describe("ChannelAppSimpleService system-version validation", () => {
  const createService = () =>
    new ChannelAppSimpleService(new Map(), {
      appId: "test-app",
      appSecret: "test-secret",
    });

  it("continues to serve the v1 catalog", async () => {
    await expect(
      createService().handleFunctionCall(
        {
          method: "extension.core.function.getFunctions",
          systemVersion: "v1",
          context: {} as never,
        },
        "v1"
      )
    ).resolves.toMatchObject({ result: { functions: [] } });
  });

  it("rejects non-v1 routes", async () => {
    await expect(
      createService().handleFunctionCall(
        {
          method: "extension.core.function.getFunctions",
          systemVersion: "v2",
          context: {} as never,
        },
        "v2"
      )
    ).rejects.toBeInstanceOf(VersionMismatchError);
  });

  it("rejects URL and body version mismatches", async () => {
    await expect(
      createService().handleFunctionCall(
        {
          method: "extension.core.function.getFunctions",
          systemVersion: "v2",
          context: {} as never,
        },
        "v1"
      )
    ).rejects.toMatchObject({ routeVersion: "v1", requestedVersion: "v2" });
  });
});
