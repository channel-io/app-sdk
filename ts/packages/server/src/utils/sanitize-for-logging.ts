const REDACTED_LOG_VALUE = "[REDACTED]";
const CIRCULAR_LOG_VALUE = "[Circular]";
const SENSITIVE_LOG_KEYS = new Set([
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
  "xaccesstoken",
  "resumeurl",
  "resumenonce",
  "oauthflownonce",
]);

function normalizeSensitiveLogKey(key: string): string {
  return key.toLowerCase().replace(/[^a-z0-9]/g, "");
}

export function sanitizeForLogging(value: unknown, key?: string, seen = new WeakSet()): unknown {
  if (key && SENSITIVE_LOG_KEYS.has(normalizeSensitiveLogKey(key))) {
    return REDACTED_LOG_VALUE;
  }

  // Redirect destinations can embed the signed resume URL as an encoded query value.
  if (typeof value === "string" && value.toLowerCase().includes("oauthflownonce")) {
    return REDACTED_LOG_VALUE;
  }

  if (Array.isArray(value)) {
    return value.map((item) => sanitizeForLogging(item, undefined, seen));
  }

  if (value && typeof value === "object") {
    if (seen.has(value)) {
      return CIRCULAR_LOG_VALUE;
    }
    seen.add(value);

    return Object.fromEntries(
      Object.entries(value).map(([entryKey, entryValue]) => [
        entryKey,
        sanitizeForLogging(entryValue, entryKey, seen),
      ])
    );
  }

  return value;
}
