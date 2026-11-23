import type { z } from "zod";

const MESSAGING_EXTENSION_METHOD_PREFIX = "extension.messaging.";

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return Object.prototype.toString.call(value) === "[object Object]";
}

function toCamelCaseKey(key: string): string {
  return key.replace(/_([a-z0-9])/g, (_, char: string) => char.toUpperCase());
}

function camelizeObjectKeys(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map((item) => camelizeObjectKeys(item));
  }

  if (!isPlainObject(value)) {
    return value;
  }

  const result: Record<string, unknown> = {};

  for (const [key, nestedValue] of Object.entries(value)) {
    const camelKey = toCamelCaseKey(key);
    if (camelKey !== key && Object.prototype.hasOwnProperty.call(result, camelKey)) {
      continue;
    }

    result[camelKey] = camelizeObjectKeys(nestedValue);
  }

  return result;
}

export function isMessagingExtensionMethod(methodName: string): boolean {
  return methodName.startsWith(MESSAGING_EXTENSION_METHOD_PREFIX);
}

export function parseMessagingExtensionInputParams<Schema extends z.ZodType>(
  inputSchema: Schema,
  params: unknown
): z.output<Schema> {
  const camelizedResult = inputSchema.safeParse(camelizeObjectKeys(params));
  if (camelizedResult.success) {
    return camelizedResult.data;
  }

  const rawResult = inputSchema.safeParse(params);
  if (rawResult.success) {
    return rawResult.data;
  }

  throw camelizedResult.error;
}
