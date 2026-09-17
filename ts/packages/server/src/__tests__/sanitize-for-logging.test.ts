import { describe, expect, it } from "vitest";
import { sanitizeForLogging } from "../utils/sanitize-for-logging.js";

describe("sanitizeForLogging", () => {
  it("redacts OAuth resume nonces and redirect URLs that embed them", () => {
    expect(
      sanitizeForLogging({
        resumeUrl: "https://desk.example/return?oauthFlowNonce=secret",
        resumeNonce: "secret",
        oauth_flow_nonce: "secret",
        result: {
          type: "redirect",
          url: "https://setup.example/?returnTo=https%3A%2F%2Fdesk.example%3FoauthFlowNonce%3Dsecret",
        },
        flowId: "flow-1",
      })
    ).toEqual({
      resumeUrl: "[REDACTED]",
      resumeNonce: "[REDACTED]",
      oauth_flow_nonce: "[REDACTED]",
      result: { type: "redirect", url: "[REDACTED]" },
      flowId: "flow-1",
    });
  });

  it.each(["oauth_flow_nonce", "oauth-flow-nonce", "OAuth_Flow_Nonce"])(
    "redacts %s inside nested and encoded redirect URLs",
    (nonceKey) => {
      const resumeUrl = `https://desk.example/return?${nonceKey}=secret`;
      expect(
        sanitizeForLogging({
          result: {
            url: `https://setup.example/?returnTo=${encodeURIComponent(resumeUrl)}`,
            returnTo: resumeUrl,
          },
        })
      ).toEqual({
        result: { url: "[REDACTED]", returnTo: "[REDACTED]" },
      });
    }
  );

  it("redacts space-separated nonce names in strings", () => {
    expect(sanitizeForLogging({ url: "https://desk.example/?oauth flow nonce=secret" })).toEqual({
      url: "[REDACTED]",
    });
  });

  it.each([
    "oauth%46lowNonce",
    "oauth%5Fflow%5Fnonce",
    "oauth%2Dflow%2Dnonce",
    "oauth%20flow%20nonce",
  ])("redacts encoded nonce name %s in direct and nested URLs", (nonceKey) => {
    const resumeUrl = `https://desk.example/?${nonceKey}=secret`;
    const redirectUrl = `https://setup.example/?returnTo=${encodeURIComponent(resumeUrl)}`;
    expect(
      sanitizeForLogging({
        url: resumeUrl,
        nested: { returnTo: `https://outer.example/?next=${encodeURIComponent(redirectUrl)}` },
      })
    ).toEqual({ url: "[REDACTED]", nested: { returnTo: "[REDACTED]" } });
  });

  it("redacts encoded nonces even when another URL component has malformed escapes", () => {
    expect(
      sanitizeForLogging({ url: "https://desk.example/?broken=%FF%&oauth%46lowNonce=secret" })
    ).toEqual({ url: "[REDACTED]" });
  });

  it("redacts deeply encoded values without unbounded decoding", () => {
    let url = "https://desk.example/?oauth%46lowNonce=secret";
    for (let i = 0; i < 8; i++) {
      url = encodeURIComponent(url);
    }
    expect(sanitizeForLogging({ url })).toEqual({ url: "[REDACTED]" });
  });

  it("preserves unrelated text and URLs, including malformed percent escapes", () => {
    const value = {
      url: "https://desk.example/?returnTo=https%3A%2F%2Fsetup.example%2Fdone&broken=%FF%",
      message: "100% complete",
    };
    expect(sanitizeForLogging(value)).toEqual(value);
  });

  it("should redact snake_case and kebab-case sensitive keys", () => {
    expect(
      sanitizeForLogging({
        access_token: "access-123",
        "refresh-token": "refresh-456",
        "x-access-token": "x-access-789",
        api_key: "api-key-000",
        client_secret: "client-secret-111",
        auth_token: "auth-token-222",
      })
    ).toEqual({
      access_token: "[REDACTED]",
      "refresh-token": "[REDACTED]",
      "x-access-token": "[REDACTED]",
      api_key: "[REDACTED]",
      client_secret: "[REDACTED]",
      auth_token: "[REDACTED]",
    });
  });

  it("should keep non-sensitive keys unchanged", () => {
    expect(
      sanitizeForLogging({
        channelId: "channel-1",
        status: "ok",
      })
    ).toEqual({
      channelId: "channel-1",
      status: "ok",
    });
  });
});
