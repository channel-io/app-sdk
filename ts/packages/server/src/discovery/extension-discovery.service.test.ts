import "reflect-metadata";
import type { DiscoveryService } from "@nestjs/core";
import { Reflector } from "@nestjs/core";
import { describe, expect, it } from "vitest";
import { Extension, Func, TestFunc } from "../decorators/index.js";
import { ExtensionDiscoveryService } from "./extension-discovery.service.js";

class StandaloneFunctions {
  @Func("public.ping")
  async publicPing() {
    return { source: "public" };
  }

  @Func({ name: "admin.ping", hidden: true })
  async hiddenPing() {
    return { source: "hidden" };
  }

  @TestFunc("test.visible")
  async visibleTest() {
    return { source: "test" };
  }

  @TestFunc({ name: "test.hidden", hidden: true })
  async hiddenTest() {
    return { source: "hidden-test" };
  }
}

@Extension("userAuthorization")
class UserAuthorizationExtension {
  @Func("metadata.getConfig")
  getConfig() {
    return { functions: [] };
  }
}

function createDiscoveryService(
  providers: Array<{ instance: unknown; metatype: unknown }> = [
    {
      instance: new StandaloneFunctions(),
      metatype: StandaloneFunctions,
    },
  ]
): ExtensionDiscoveryService {
  const nestDiscovery = {
    getProviders: () => providers,
  } as unknown as DiscoveryService;
  const service = new ExtensionDiscoveryService(nestDiscovery, new Reflector());
  service.onModuleInit();
  return service;
}

describe("ExtensionDiscoveryService hidden functions", () => {
  it("omits hidden functions from public and test discovery", () => {
    const service = createDiscoveryService();

    expect(service.getPublicFunctions().map((func) => func.fullName)).toEqual(["public.ping"]);
    expect(service.getTestFunctions().map((func) => func.fullName)).toEqual(["test.visible"]);
  });

  it("keeps hidden functions registered and directly invokable", async () => {
    const service = createDiscoveryService();

    expect(service.getAllFunctions().map((func) => func.fullName)).toEqual([
      "public.ping",
      "admin.ping",
      "test.visible",
      "test.hidden",
    ]);

    const hidden = service.getFunction("admin.ping");
    expect(hidden).toMatchObject({ fullName: "admin.ping", hidden: true });
    await expect(hidden!.handler({}, {})).resolves.toEqual({
      source: "hidden",
    });
  });
});

describe("ExtensionDiscoveryService", () => {
  it("builds the canonical userAuthorization metadata Function name", () => {
    const service = createDiscoveryService([
      {
        instance: new UserAuthorizationExtension(),
        metatype: UserAuthorizationExtension,
      },
    ]);

    expect(service.getFunction("extension.userAuthorization.metadata.getConfig")).toMatchObject({
      name: "metadata.getConfig",
      fullName: "extension.userAuthorization.metadata.getConfig",
      methodName: "getConfig",
    });
  });
});
