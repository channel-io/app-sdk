import { createServer, type Server } from "node:http";
import type { AddressInfo } from "node:net";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Context } from "@channel.io/app-sdk-core";
import type { HttpAdapterHost } from "@nestjs/core";
import { NativeFunctionClient } from "../native/client.js";
import { AppStoreClient } from "../appstore/client.js";
import { TokenManager } from "../token/manager.js";
import { ChannelAppService } from "../nestjs/channel-app.service.js";
import type { ExtensionDiscoveryService } from "../discovery/extension-discovery.service.js";
import { ChannelAppSimpleService } from "../simple/channel-app.js";
import { runWithAppPersonInvocation } from "../utils/app-person-invocation.js";
import { sanitizeForLogging } from "../utils/sanitize-for-logging.js";

const contextFor = (id: string): Context => ({
  caller: { type: "system" },
  channel: { id: `ch-${id}` },
  appPersonInvocation: {
    invocationId: id,
    accessToken: `aph1.${id}.${Buffer.alloc(32, 1).toString("base64url")}`,
  },
});

describe("AppPerson delegated callback transport", () => {
  let server: Server;
  let url: string;
  let requests: {
    path: string;
    token: string | undefined;
    body: { method: string; params?: unknown; context?: Context };
  }[];
  beforeEach(async () => {
    requests = [];
    server = createServer(async (req, res) => {
      let body = "";
      for await (const chunk of req) body += String(chunk);
      const parsed = JSON.parse(body);
      requests.push({
        path: req.url!,
        token: req.headers["x-access-token"] as string | undefined,
        body: parsed,
      });
      res.setHeader("content-type", "application/json");
      res.end(
        JSON.stringify({
          result:
            parsed.method === "issueToken"
              ? { accessToken: "ordinary", refreshToken: "refresh", expiresIn: 3600 }
              : {
                  status: "published",
                  deskMessageId: "message",
                },
        })
      );
    });
    await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
    url = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  });
  afterEach(async () => {
    vi.restoreAllMocks();
    await new Promise<void>((resolve, reject) =>
      server.close((err) => (err ? reject(err) : resolve()))
    );
  });

  it.each(["nest", "simple"])(
    "isolates concurrent %s handlers across singleton clients and serializes primary credentials",
    async (kind) => {
      const native = new NativeFunctionClient({ appStoreUrl: url, debug: true });
      const manager = new TokenManager({ appId: "app", appSecret: "secret", appStoreUrl: url });
      const debug = vi.spyOn(console, "debug").mockImplementation(() => {});
      let entered = 0;
      let release!: () => void;
      const barrier = new Promise<void>((resolve) => {
        release = resolve;
      });
      const handler = async (ctx: Context) => {
        if (++entered === 2) release();
        await barrier;
        const token = await manager.getChannelToken({ channelId: ctx.channel.id });
        expect(token.accessToken).toBe(ctx.appPersonInvocation!.accessToken);
        expect(token.refreshToken).toBe("");
        await native.callNativeFunction("getUserChatAsManager", {
          channelId: ctx.channel.id,
          userChatId: "source",
        });
        await native.callAppFunction("app", "nested", {}, ctx, "ordinary-ignored");
        return native.replyToAppPersonInvocation(
          { invocationId: ctx.appPersonInvocation!.invocationId, plainText: "private answer" },
          "ordinary-ignored"
        );
      };
      const discovery = {
        getFunction: () => ({ handler }),
      } as unknown as ExtensionDiscoveryService;
      const service =
        kind === "nest"
          ? new ChannelAppService(
              { appId: "app", appSecret: "secret", debug: true },
              {} as HttpAdapterHost,
              native,
              manager,
              discovery
            )
          : // eslint-disable-next-line @typescript-eslint/no-deprecated
            new ChannelAppSimpleService(new Map([["test", { handler } as never]]), {
              appId: "app",
              appSecret: "secret",
            });
      const serviceDebug =
        kind === "nest"
          ? vi
              .spyOn(
                (service as unknown as { logger: { debug: (message: string) => void } }).logger,
                "debug"
              )
              .mockImplementation(() => {})
          : undefined;
      await Promise.all(
        ["one", "two"].map((id) =>
          service.handleFunctionCall({ method: "test", context: contextFor(id) })
        )
      );
      expect(requests).toHaveLength(6);
      for (const id of ["one", "two"]) {
        const own = requests.filter(
          (r) => r.token === contextFor(id).appPersonInvocation!.accessToken
        );
        expect(own).toHaveLength(3);
        expect(own.map((r) => r.body.method).sort()).toEqual([
          "getUserChatAsManager",
          "nested",
          "replyToAppPersonInvocation",
        ]);
        const reply = own.find((r) => r.body.method === "replyToAppPersonInvocation")!;
        expect(reply.path).toBe("/general/v1/native/functions");
        expect(reply.body.params).toEqual({ invocationId: id, plainText: "private answer" });
      }
      expect(JSON.stringify(debug.mock.calls)).not.toContain("aph1.");
      if (serviceDebug) {
        expect(JSON.stringify(serviceDebug.mock.calls)).not.toContain("aph1.");
        expect(JSON.stringify(serviceDebug.mock.calls)).toContain("[REDACTED]");
      }
      expect(JSON.stringify(debug.mock.calls)).not.toContain("private answer");
      manager.destroy();
    }
  );

  it("rejects marked incomplete contexts before handler, cache or HTTP fallback", async () => {
    const native = new NativeFunctionClient({ appStoreUrl: url });
    const manager = new TokenManager({ appId: "app", appSecret: "secret", appStoreUrl: url });
    const handler = vi.fn(async () => {
      await manager.getAppToken();
      await native.callNativeFunctionWithToken("getUserChatAsManager", {}, "ordinary");
    });
    const service = new ChannelAppService(
      { appId: "app", appSecret: "secret" },
      {} as HttpAdapterHost,
      native,
      manager,
      { getFunction: () => ({ handler }) } as unknown as ExtensionDiscoveryService
    );
    for (const marker of [
      null,
      {},
      { invocationId: "one" },
      { invocationId: "one", accessToken: "ordinary" },
      { invocationId: "other", accessToken: contextFor("one").appPersonInvocation!.accessToken },
    ]) {
      const ctx = { ...contextFor("one"), appPersonInvocation: marker } as Context;
      await expect(service.handleFunctionCall({ method: "test", context: ctx })).rejects.toThrow(
        "Invalid AppPerson invocation context"
      );
    }
    expect(handler).not.toHaveBeenCalled();
    expect(requests).toHaveLength(0);
    manager.destroy();
  });

  it("blocks issue/refresh and foreign channel, never caches delegated credentials, preserves ordinary issuance", async () => {
    const native = new NativeFunctionClient({ appStoreUrl: url });
    const manager = new TokenManager({ appId: "app", appSecret: "secret", appStoreUrl: url });
    await runWithAppPersonInvocation(contextFor("one"), async () => {
      expect((await manager.getAppToken()).accessToken).toBe(
        contextFor("one").appPersonInvocation!.accessToken
      );
      await expect(manager.getChannelToken({ channelId: "foreign" })).rejects.toThrow(
        "channel mismatch"
      );
      await expect(native.issueToken("secret")).rejects.toThrow("issuance and refresh");
      await expect(native.refreshToken("refresh")).rejects.toThrow("issuance and refresh");
      await expect(manager.refreshToken("refresh")).rejects.toThrow("issuance and refresh");
      await expect(
        native.callAppFunction("app", "nested", {}, contextFor("two"), "ordinary")
      ).rejects.toThrow("context mismatch");
    });
    expect(requests).toHaveLength(0);
    await runWithAppPersonInvocation(contextFor("one"), async () => {
      const stripped = { caller: { type: "system" as const }, channel: { id: "ch-one" } };
      await runWithAppPersonInvocation(stripped, async () => {
        expect((await manager.getAppToken()).accessToken).toBe(
          contextFor("one").appPersonInvocation!.accessToken
        );
        // eslint-disable-next-line @typescript-eslint/no-deprecated
        await expect(
          new AppStoreClient({
            appId: "app",
            appSecret: "secret",
            appStoreUrl: url,
          }).registerExtension({ extensionName: "hook", systemVersion: "v1" })
        ).rejects.toThrow("Legacy AppStore authentication");
      });
    });
    expect(requests).toHaveLength(0);
    expect((await manager.getAppToken()).accessToken).toBe("ordinary");
    expect(requests).toHaveLength(1);
    expect(requests[0]!.token).toBeUndefined();
    await runWithAppPersonInvocation(contextFor("one"), async () => {
      expect((await manager.getAppToken()).accessToken).toBe(
        contextFor("one").appPersonInvocation!.accessToken
      );
    });
    expect((await manager.getAppToken()).accessToken).toBe("ordinary");
    expect(requests).toHaveLength(1);
    manager.destroy();
  });

  it("redacts the entire metadata and serialized credential values", () => {
    expect(
      sanitizeForLogging({
        appPersonInvocation: { invocationId: "private-id", accessToken: "bad" },
      })
    ).toEqual({ appPersonInvocation: "[REDACTED]" });
    expect(sanitizeForLogging(JSON.stringify(contextFor("one")))).toBe("[REDACTED]");
  });
});
