import "reflect-metadata";
import { describe, expect, it, vi } from "vitest";
import { Reflector, type DiscoveryService } from "@nestjs/core";
import type { Context } from "@channel.io/app-sdk-core";
import { CodeSessionExtension, type CodeSessionStore } from "./code-session.js";
import { ExtensionDiscoveryService } from "../discovery/extension-discovery.service.js";

const ctx: Context = {
  caller: { type: "system" },
  channel: { id: "channel" },
  invocation: { idempotencyKey: "call" },
};
function setup() {
  const store = {
    enqueue: vi.fn(),
    find: vi.fn(),
    requestStop: vi.fn(),
  } satisfies CodeSessionStore;
  const instance = new CodeSessionExtension(store);
  const discovery = new ExtensionDiscoveryService(
    {
      getProviders: () => [{ instance, metatype: CodeSessionExtension }],
    } as unknown as DiscoveryService,
    new Reflector()
  );
  discovery.onModuleInit();
  return { store, discovery };
}
describe("code session reference wiring", () => {
  it("discovers the three functions and waits for persistence before acknowledging", async () => {
    const { store, discovery } = setup();
    expect(discovery.getPublicFunctions().map((f) => f.fullName)).toEqual([
      "extension.code.session.sendInput",
      "extension.code.session.getSession",
      "extension.code.session.stopSession",
    ]);
    let commit!: () => void;
    store.enqueue.mockImplementation(
      () =>
        new Promise<void>((resolve) => {
          commit = resolve;
        })
    );
    const fn = discovery.getFunction("extension.code.session.sendInput")!;
    let settled = false;
    const pending = fn
      .handler(ctx, { sessionKey: "s", text: "fix", future: "ignored" })
      .then((result) => {
        settled = true;
        return result;
      });
    await Promise.resolve();
    expect(settled).toBe(false);
    expect(store.enqueue).toHaveBeenCalledWith(ctx, "call", { sessionKey: "s", text: "fix" });
    commit();
    await expect(pending).resolves.toEqual({ sessionKey: "s", accepted: true });
  });
  it("fails closed without trusted invocation metadata and propagates storage errors", async () => {
    const { store, discovery } = setup();
    const fn = discovery.getFunction("extension.code.session.sendInput")!;
    await expect(
      fn.handler(
        { ...ctx, invocation: undefined },
        { sessionKey: "s", text: "fix", idempotencyKey: "untrusted" }
      )
    ).rejects.toThrow();
    expect(store.enqueue).not.toHaveBeenCalled();
    store.enqueue.mockRejectedValue(new Error("storage unavailable"));
    await expect(fn.handler(ctx, { sessionKey: "s", text: "fix" })).rejects.toThrow(
      "storage unavailable"
    );
  });
  it("validates a snapshot before it crosses the handler boundary", async () => {
    const { store, discovery } = setup();
    store.find.mockResolvedValue({ sessionKey: "s", status: "idle" });
    await expect(
      discovery.getFunction("extension.code.session.getSession")!.handler(ctx, { sessionKey: "s" })
    ).rejects.toThrow();
  });
});
