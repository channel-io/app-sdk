import { describe, expect, expectTypeOf, it } from "vitest";
import { z } from "zod";
import {
  AppPersonInvocationContextSchema,
  OAuthFlowContextSchema,
  ProtoContextSchemas,
} from "../../index.js";
import type { OAuthFlowContext } from "../../index.js";

describe("OAuth flow context", () => {
  it("preserves the signed target without changing the system caller", () => {
    const target = {
      appId: "app-1",
      channelId: "channel-1",
      managerId: "manager-1",
      authScope: "manager" as const,
      targetManagerId: "manager-1",
      key: "organization-1",
    };
    const context = ProtoContextSchemas.FunctionContextProtoSchema.parse({
      caller: { type: "system", id: "system" },
      authToken: "exact-token",
      oauthFlow: target,
    });
    expect(context.oauthFlow).toEqual(target);
    expect(context.caller).toEqual({ type: "system", id: "system" });
    expect(context.authToken).toBe("exact-token");
    expect(OAuthFlowContextSchema.parse(context.oauthFlow)).toEqual(target);
    expectTypeOf<z.infer<typeof OAuthFlowContextSchema>>().toEqualTypeOf<OAuthFlowContext>();
  });

  it("rejects invalid auth scopes and permits unresolved before-hook keys", () => {
    const target = {
      appId: "app-1",
      channelId: "channel-1",
      managerId: "manager-1",
      authScope: "channel",
    };
    expect(OAuthFlowContextSchema.parse(target)).toEqual(target);
    expect(() => OAuthFlowContextSchema.parse({ ...target, authScope: "app" })).toThrow();
    expect(() => OAuthFlowContextSchema.parse({ ...target, managerId: "" })).toThrow();
  });
});

describe("AppPerson callback context", () => {
  const token = `aph1.run.${"A".repeat(43)}`;
  it("round trips private metadata through the owning proto schema", () => {
    const context = ProtoContextSchemas.FunctionContextProtoSchema.parse({
      appPersonInvocation: { invocationId: "run", accessToken: token },
    });
    expect(AppPersonInvocationContextSchema.parse(context.appPersonInvocation)).toEqual({
      invocationId: "run",
      accessToken: token,
    });
  });
  it.each([
    null,
    {},
    { invocationId: "run" },
    { invocationId: "other", accessToken: token },
    { invocationId: "run", accessToken: token.slice(0, -1) + "B" },
    { invocationId: "run", accessToken: token, sourceId: "forged" },
  ])("rejects incomplete or noncanonical binding %#", (value) => {
    expect(AppPersonInvocationContextSchema.safeParse(value).success).toBe(false);
  });
});
