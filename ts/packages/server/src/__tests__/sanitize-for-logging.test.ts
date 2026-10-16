import { describe, expect, it } from "vitest";
import { sanitizeForLogging } from "../utils/sanitize-for-logging.js";

describe("sanitizeForLogging", () => {
  it.each(["privateKey", "private_key", "private-key", "PRIVATE_KEY"])(
    "redacts nested %s fields without changing the input or unrelated config",
    (key) => {
      const request = {
        config: [{ [key]: "synthetic-key-material", privateKeyId: "key-1", enabled: true }],
      };
      expect(sanitizeForLogging(request)).toEqual({
        config: [{ [key]: "[REDACTED]", privateKeyId: "key-1", enabled: true }],
      });
      expect(request.config[0]?.[key]).toBe("synthetic-key-material");
    }
  );

  // Construct synthetic boundaries rather than keeping credential-shaped fixtures.
  const privateKey = (kind: string) =>
    `-----BEGIN ${kind}-----\nsynthetic-key-material\n-----END ${kind}-----`;

  it.each([
    "PRIVATE KEY",
    "RSA PRIVATE KEY",
    "EC PRIVATE KEY",
    "ENCRYPTED PRIVATE KEY",
    "OPENSSH PRIVATE KEY",
  ])("redacts %s regardless of field name, serialization, or URL encoding", (kind) => {
    const pem = privateKey(kind);
    const form = new URLSearchParams({ credential: pem }).toString();
    expect(
      sanitizeForLogging({
        message: `Failed with config: ${pem}`,
        serialized: JSON.stringify({ credential: pem }),
        values: [pem, encodeURIComponent(pem), encodeURIComponent(encodeURIComponent(pem))],
        form,
        nestedForm: { redirect: `https://example.com/?next=${encodeURIComponent(form)}` },
      })
    ).toEqual({
      message: "[REDACTED]",
      serialized: "[REDACTED]",
      values: ["[REDACTED]", "[REDACTED]", "[REDACTED]"],
      form: "[REDACTED]",
      nestedForm: { redirect: "[REDACTED]" },
    });
  });

  it("redacts incomplete PEM and malformed or deeply encoded credential strings", () => {
    const pem = privateKey("PRIVATE KEY");
    let deeplyEncoded = pem;
    for (let i = 0; i < 8; i++) deeplyEncoded = encodeURIComponent(deeplyEncoded);
    expect(
      sanitizeForLogging([
        pem.slice(0, pem.indexOf("synthetic")) + "partial",
        `%FF% ${encodeURIComponent(pem)}`,
        deeplyEncoded,
      ])
    ).toEqual(["[REDACTED]", "[REDACTED]", "[REDACTED]"]);
  });

  it("preserves public material, ordinary strings, and non-secret config", () => {
    const value = {
      publicKey: "-----BEGIN PUBLIC KEY-----\\nsynthetic-public-data\\n-----END PUBLIC KEY-----",
      certificate:
        "-----BEGIN CERTIFICATE-----\\nsynthetic-certificate\\n-----END CERTIFICATE-----",
      privateKeyId: "public-key-identifier",
      message: "A private key is configured",
      empty: "",
      count: 0,
      enabled: false,
      optional: null,
    };
    expect(sanitizeForLogging(value)).toEqual(value);
  });

  it("handles circular arrays and objects while still redacting their sibling values", () => {
    const array: unknown[] = [{ private_key: "synthetic-key-material" }];
    const object: Record<string, unknown> = { array, status: "ok" };
    array.push(array, object);
    object["self"] = object;
    const sanitized = sanitizeForLogging(object);
    expect(sanitized).toEqual({
      array: [{ private_key: "[REDACTED]" }, "[Circular]", "[Circular]"],
      status: "ok",
      self: "[Circular]",
    });
    expect(() => JSON.stringify(sanitized)).not.toThrow();
  });

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
    "oauth+flow+nonce",
    "oauth%2Bflow%2Bnonce",
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
