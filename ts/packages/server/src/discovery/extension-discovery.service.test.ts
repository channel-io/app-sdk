import "reflect-metadata";
import type { DiscoveryService } from "@nestjs/core";
import { Reflector } from "@nestjs/core";
import { describe, expect, it } from "vitest";
import { Extension, Func } from "../decorators/index.js";
import { ExtensionDiscoveryService } from "./extension-discovery.service.js";

@Extension("userAuthorization")
class UserAuthorizationExtension {
  @Func("metadata.getConfig")
  getConfig() {
    return { systemVersions: ["v1"], functions: [] };
  }
}

describe("ExtensionDiscoveryService", () => {
  it("builds the canonical userAuthorization metadata Function name", () => {
    const discoveryService = {
      getProviders: () => [
        {
          instance: new UserAuthorizationExtension(),
          metatype: UserAuthorizationExtension,
        },
      ],
    } as unknown as DiscoveryService;
    const service = new ExtensionDiscoveryService(discoveryService, new Reflector());

    service.onModuleInit();

    expect(service.getFunction("extension.userAuthorization.metadata.getConfig")).toMatchObject({
      name: "metadata.getConfig",
      fullName: "extension.userAuthorization.metadata.getConfig",
      methodName: "getConfig",
    });
  });
});
