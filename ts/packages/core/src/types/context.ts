import type {
  Caller as ProtoCaller,
  Channel as ProtoChannel,
  FunctionContext as ProtoFunctionContext,
  User as ProtoUser,
  UserChat as ProtoUserChat,
} from "../gen/channel/app/sdk/v1/context.js";
import type {
  FunctionRequest as ProtoFunctionRequest,
  FunctionResponse as ProtoFunctionResponse,
} from "../gen/channel/app/sdk/v1/function.js";
import type { FunctionError as ProtoFunctionError } from "../gen/channel/app/sdk/v1/error.js";

/**
 * Caller type — matches Go's CallerType constants
 */
export type CallerType = "user" | "manager" | "system" | "app";

/**
 * Caller information from the function call context
 */
export interface Caller extends ProtoCaller {
  /** Caller type */
  type: CallerType;
  /** Caller's unique identifier (omitted for some system calls) */
  id?: string;
}

/**
 * Channel information from the function call context
 */
export interface Channel extends ProtoChannel {
  /** Channel's unique identifier */
  id: string;
}

/**
 * User information from the function call context.
 */
export type User = ProtoUser;

/**
 * User chat information from the function call context.
 */
export type UserChat = ProtoUserChat;

/**
 * Context passed to function handlers.
 * Mirrors Go's ChannelContext struct (internal/domain/app/subdomain/core/svc/function.go).
 */
export interface Context extends Omit<
  ProtoFunctionContext,
  "caller" | "channel" | "user" | "userChat"
> {
  /** Caller information */
  caller: Caller;
  /** Channel information */
  channel: Channel;
  /** User information, when the function is scoped to a user. */
  user?: User;
  /** User chat information, when the function is scoped to a chat. */
  userChat?: UserChat;
  /** Language preference (e.g., "ko", "en") */
  language?: string;
  /** OAuth token (decrypted, auto-injected when OAuth is configured) */
  authToken?: string;
  /** OAuth provider token alias accepted for compatibility. */
  legacyAuthToken?: string;
  /**
   * Decrypted API Key credentials.
   * AppStore automatically injects this for all function calls
   * once the channel/manager has active credentials stored.
   * Keys correspond to the field names defined in getAuthConfig.
   */
  apiCredentials?: Record<string, string>;
  /**
   * Stored config values resolved by AppStore for the active scope.
   * This is the canonical config payload for the config extension and
   * also the forward-compatible source of truth for Config-based credential setups.
   */
  config?: Record<string, unknown>;
  /** Sandbox mode flag (for LLM mock testing) */
  sandbox?: boolean;
  /** Sandbox session ID (stateful mode) */
  sessionId?: string;
  /** Initial state for new sandbox session */
  seedState?: unknown;
  /** Additional context data from future AppStore versions */
  [key: string]: unknown;
}

/**
 * Raw request body from Channel.io
 */
export interface FunctionCallRequest extends Omit<ProtoFunctionRequest, "context" | "params"> {
  /** Function method name (e.g., "extension.calendar.booking.createBooking") */
  method: string;
  /** Function call context */
  context: Context;
  /** Function parameters */
  params?: Record<string, unknown>;
}

/**
 * Response format for function calls
 */
export interface FunctionCallErrorResponse extends Omit<ProtoFunctionError, "code" | "message"> {
  /** JSON-RPC error code */
  code: number;
  /** Human-readable error message */
  message: string;
  /** Optional structured error data */
  data?: unknown;
  /** Optional compatibility error type */
  type?: string;
}

export interface FunctionCallResponse<T = unknown> extends Omit<
  ProtoFunctionResponse,
  "result" | "error"
> {
  /** Result data */
  result?: T;
  /** JSON-RPC function error */
  error?: FunctionCallErrorResponse;
}
