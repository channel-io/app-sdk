import { AsyncLocalStorage } from "node:async_hooks";
import {
  AppPersonInvocationContextSchema,
  type Context,
  type AppPersonInvocationContext,
} from "@channel.io/app-sdk-core";

interface InvocationBinding {
  readonly invocation: Readonly<AppPersonInvocationContext>;
  readonly channelId: string;
}
const invocationStorage = new AsyncLocalStorage<InvocationBinding | undefined>();

function bindingFrom(context: Context): InvocationBinding | undefined {
  if (!("appPersonInvocation" in context)) return undefined;
  const parsed = AppPersonInvocationContextSchema.safeParse(context.appPersonInvocation);
  const channelId = (context as { channel?: { id?: unknown } }).channel?.id;
  if (!parsed.success || typeof channelId !== "string" || channelId.length === 0) {
    throw new Error("Invalid AppPerson invocation context");
  }
  return Object.freeze({ invocation: Object.freeze(parsed.data), channelId });
}

/** Capture an immutable, request-local binding before invoking application code. */
export function runWithAppPersonInvocation<T>(context: Context, handler: () => T): T {
  return invocationStorage.run(delegatedInvocation(context), handler);
}

export function delegatedInvocation(context?: Context): InvocationBinding | undefined {
  const current = invocationStorage.getStore();
  // Validate explicitly marked nested contexts even when a binding is already active.
  const explicit = context ? bindingFrom(context) : undefined;
  if (current && explicit && current.invocation.accessToken !== explicit.invocation.accessToken) {
    throw new Error("AppPerson invocation context mismatch");
  }
  return current ?? explicit;
}

export function callbackAccessToken(
  method: string,
  ordinary?: string,
  context?: Context
): string | undefined {
  const binding = delegatedInvocation(context);
  if (binding && (method === "issueToken" || method === "refreshToken")) {
    throw new Error("Token issuance and refresh are unavailable during AppPerson invocation");
  }
  return binding?.invocation.accessToken ?? ordinary;
}
