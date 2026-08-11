import { HttpException, HttpStatus } from "@nestjs/common";
import { ValidationError } from "@channel.io/app-sdk-core";
import { describe, expect, it, vi } from "vitest";
import { ChannelAppController } from "./channel-app.controller.js";
import { VersionMismatchError, type ChannelAppService } from "./channel-app.service.js";

describe("ChannelAppController", () => {
  it("returns HTTP 400 for input validation errors", async () => {
    const validationError = new ValidationError("Invalid function input", [
      { code: "invalid_type", path: ["quantity"] },
    ]);
    const service = {
      handleFunctionCall: vi.fn().mockRejectedValue(validationError),
    } as unknown as ChannelAppService;
    const controller = new ChannelAppController(service);

    try {
      await controller.handleVersionedFunctions("v1", {
        method: "extension.cafe.addCartItem",
        context: {
          caller: { type: "manager", id: "manager-1" },
          channel: { id: "channel-1" },
        },
        params: { quantity: "1" },
      });
      expect.fail("Expected validation to fail");
    } catch (error) {
      expect(error).toBeInstanceOf(HttpException);
      const httpError = error as HttpException;
      expect(httpError.getStatus()).toBe(HttpStatus.BAD_REQUEST);
      expect(httpError.getResponse()).toEqual({
        error: "VALIDATION_ERROR",
        message: "Invalid function input",
        details: [{ code: "invalid_type", path: ["quantity"] }],
      });
    }
  });

  it("returns HTTP 400 with version details for version mismatches", async () => {
    const service = {
      handleFunctionCall: vi.fn().mockRejectedValue(new VersionMismatchError("v2", ["v1"], "v1")),
    } as unknown as ChannelAppService;
    const controller = new ChannelAppController(service);

    try {
      await controller.handleVersionedFunctions("v1", {
        method: "orders.get",
        systemVersion: "v2",
        context: {} as never,
      });
      expect.fail("Expected version validation to fail");
    } catch (error) {
      expect(error).toBeInstanceOf(HttpException);
      const httpError = error as HttpException;
      expect(httpError.getStatus()).toBe(HttpStatus.BAD_REQUEST);
      expect(httpError.getResponse()).toEqual({
        error: "VERSION_MISMATCH",
        type: "versionMismatch",
        message: "Request system version 'v2' does not match route version 'v1'",
        requestedVersion: "v2",
        availableVersions: ["v1"],
        routeVersion: "v1",
      });
    }
  });

  it("returns the stable versionMismatch type for unsupported versions", async () => {
    const service = {
      handleFunctionCall: vi.fn().mockRejectedValue(new VersionMismatchError("v3", ["v1", "v2"])),
    } as unknown as ChannelAppService;
    const controller = new ChannelAppController(service);

    try {
      await controller.handleVersionedFunctions("v3", {
        method: "orders.get",
        systemVersion: "v3",
        context: {} as never,
      });
      expect.fail("Expected unsupported version to fail");
    } catch (error) {
      const httpError = error as HttpException;
      expect(httpError.getStatus()).toBe(HttpStatus.BAD_REQUEST);
      expect(httpError.getResponse()).toMatchObject({
        error: "VERSION_MISMATCH",
        type: "versionMismatch",
        requestedVersion: "v3",
        availableVersions: ["v1", "v2"],
      });
    }
  });
});
