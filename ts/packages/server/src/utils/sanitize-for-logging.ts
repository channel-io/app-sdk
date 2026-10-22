const REDACTED_LOG_VALUE = "[REDACTED]";
const CIRCULAR_LOG_VALUE = "[Circular]";
const OAUTH_FLOW_NONCE_NAME = /oauth[-_ +]?flow[-_ +]?nonce/i;
// Match the opening boundary too: truncated or escaped PEM must never be logged.
const PRIVATE_KEY_BOUNDARY = /-----BEGIN[ +](?:[A-Z0-9]+[ +])*PRIVATE[ +]KEY-----/i;
const SENSITIVE_LOG_KEYS = new Set([
  "apppersoninvocation",
  "secret",
  "appsecret",
  "refreshtoken",
  "accesstoken",
  "authtoken",
  "authentication",
  "apicredentials",
  "apikey",
  "authorization",
  "clientsecret",
  "password",
  "privatekey",
  "xaccesstoken",
  "resumeurl",
  "resumenonce",
  "oauthflownonce",
]);

function normalizeSensitiveLogKey(key: string): string {
  return key.toLowerCase().replace(/[^a-z0-9]/g, "");
}

function shouldRedactSensitiveString(value: string): boolean {
  for (let depth = 0; depth < 4; depth++) {
    if (
      value.includes("aph1.") ||
      OAUTH_FLOW_NONCE_NAME.test(value) ||
      PRIVATE_KEY_BOUNDARY.test(value)
    ) {
      return true;
    }
    // Decode bytes only for detection; malformed escapes must not stop masking.
    const decoded = value.replace(/%([0-9a-f]{2})/gi, (_, hex: string) =>
      String.fromCharCode(parseInt(hex, 16))
    );
    if (decoded === value) {
      return false;
    }
    value = decoded;
  }
  // Bound work for deeply nested redirects and hide values we cannot fully inspect.
  return (
    value.includes("aph1.") ||
    OAUTH_FLOW_NONCE_NAME.test(value) ||
    PRIVATE_KEY_BOUNDARY.test(value) ||
    /%[0-9a-f]{2}/i.test(value)
  );
}

export function sanitizeForLogging(value: unknown, key?: string, seen = new WeakSet()): unknown {
  if (key && SENSITIVE_LOG_KEYS.has(normalizeSensitiveLogKey(key))) {
    return REDACTED_LOG_VALUE;
  }

  // Sensitive material can appear inside a serialized config or an encoded URL.
  if (typeof value === "string" && shouldRedactSensitiveString(value)) {
    return REDACTED_LOG_VALUE;
  }

  if (value && typeof value === "object") {
    if (seen.has(value)) {
      return CIRCULAR_LOG_VALUE;
    }
    seen.add(value);

    if (Array.isArray(value)) {
      return value.map((item) => sanitizeForLogging(item, undefined, seen));
    }

    return Object.fromEntries(
      Object.entries(value).map(([entryKey, entryValue]) => [
        entryKey,
        sanitizeForLogging(entryValue, entryKey, seen),
      ])
    );
  }

  return value;
}
