import { DiscoveryService, Reflector } from "@nestjs/core";
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

function createDiscoveryService(
  ...providerTypes: (new () => unknown)[]
): ExtensionDiscoveryService {
  const providers = (providerTypes.length === 0 ? [StandaloneFunctions] : providerTypes).map(
    (metatype) => ({
      instance: new metatype(),
      metatype,
    })
  );
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

@Extension({ name: "calendar", systemVersion: "v1" })
class CalendarV1 {
  @Func("getAvailability")
  async getAvailability() {
    return { version: "v1" };
  }
}

@Extension({ name: "calendar", systemVersion: "v2" })
class CalendarV2 {
  @Func("getAvailability")
  async getAvailability() {
    return { version: "v2" };
  }
}

class VersionedStandaloneFunctions {
  @Func("orders.get")
  async getV1() {
    return { version: "v1" };
  }

  @Func({ name: "orders.get", systemVersion: "v2" })
  async getV2() {
    return { version: "v2" };
  }

  @TestFunc({ name: "test.orders.get", systemVersion: "v2" })
  async testGetV2() {
    return { version: "v2-test" };
  }
}

class DuplicateV1StandaloneFunction {
  @Func("orders.get")
  async get() {
    return {};
  }
}

@Extension({ name: "calendar", systemVersion: "v2" })
class InvalidVersionOverride {
  @Func({ name: "getAvailability", systemVersion: "v2" })
  async getAvailability() {
    return {};
  }
}

describe("ExtensionDiscoveryService system-version routing", () => {
  it("registers the same extension method independently across versions", async () => {
    const service = createDiscoveryService(CalendarV1, CalendarV2);

    expect(service.getExtensions()).toHaveLength(2);
    expect(service.getSupportedSystemVersions()).toEqual(["v1", "v2"]);
    await expect(
      service.getFunction("extension.calendar.getAvailability", "v1")!.handler({}, {})
    ).resolves.toEqual({ version: "v1" });
    await expect(
      service.getFunction("extension.calendar.getAvailability", "v2")!.handler({}, {})
    ).resolves.toEqual({ version: "v2" });
  });

  it("defaults standalone functions to v1 and accepts an explicit system version", async () => {
    const service = createDiscoveryService(VersionedStandaloneFunctions);

    expect(service.getPublicFunctions("v1").map((func) => func.fullName)).toEqual(["orders.get"]);
    expect(service.getPublicFunctions("v2").map((func) => func.fullName)).toEqual(["orders.get"]);
    expect(service.getTestFunctions("v1")).toEqual([]);
    expect(service.getTestFunctions("v2").map((func) => func.fullName)).toEqual([
      "test.orders.get",
    ]);
    await expect(service.getFunction("orders.get", "v2")!.handler({}, {})).resolves.toEqual({
      version: "v2",
    });
  });

  it("rejects function-level system versions inside an extension", () => {
    expect(() => createDiscoveryService(InvalidVersionOverride)).toThrow(
      "@Func systemVersion cannot be used inside @Extension"
    );
  });

  it("rejects duplicate methods within one system version", () => {
    expect(() =>
      createDiscoveryService(VersionedStandaloneFunctions, DuplicateV1StandaloneFunction)
    ).toThrow('Duplicate function name "orders.get" for system version "v1"');
  });

  it("rejects an explicit empty standalone system version", () => {
    expect(() => {
      class InvalidStandaloneVersion {
        @Func({ name: "orders.get", systemVersion: "  " })
        async get() {
          return {};
        }
      }

      return InvalidStandaloneVersion;
    }).toThrow("@Func systemVersion must be a non-empty string");
  });
});
