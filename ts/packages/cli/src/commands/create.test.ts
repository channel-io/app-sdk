import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { createApp } from "./create.js";

const temporaryDirectories: string[] = [];

afterEach(async () => {
  await Promise.all(temporaryDirectories.splice(0).map((path) => rm(path, { recursive: true })));
});

describe("createApp", () => {
  it("creates a current secure server, shared contract, and React WAM starter", async () => {
    const cwd = await mkdtemp(join(tmpdir(), "channel-app-cli-"));
    temporaryDirectories.push(cwd);

    const target = await createApp("hello-app", { cwd, sdkVersion: "9.8.7" });
    const serverPackage = JSON.parse(
      await readFile(join(target, "apps/server/package.json"), "utf8")
    );
    const wamPackage = JSON.parse(await readFile(join(target, "apps/wam/package.json"), "utf8"));
    const main = await readFile(join(target, "apps/server/src/main.ts"), "utf8");
    const module = await readFile(join(target, "apps/server/src/app.module.ts"), "utf8");
    const environment = await readFile(join(target, "apps/server/.env.example"), "utf8");

    expect(serverPackage.dependencies["@channel.io/app-sdk-server"]).toBe("9.8.7");
    expect(wamPackage.dependencies["@channel.io/app-sdk-wam"]).toBe("9.8.7");
    expect(wamPackage.dependencies["@channel.io/app-sdk-wam-ui"]).toBe("0.4.1");
    expect(wamPackage.dependencies["@channel.io/bezier-react"]).toBe("4.0.0-next.14");
    expect(main).toContain("rawBody: true");
    expect(module).toContain("SignatureGuard");
    expect(environment).toContain("SIGNING_KEY=");
  });

  it("rejects names that cannot be used as package scopes", async () => {
    const cwd = await mkdtemp(join(tmpdir(), "channel-app-cli-"));
    temporaryDirectories.push(cwd);

    await expect(createApp("Hello App", { cwd })).rejects.toThrow("App name must use lowercase");
  });
});
