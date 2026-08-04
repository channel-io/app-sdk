import type { z } from "zod";

/**
 * Metadata for a discovered extension
 */
export interface ExtensionMetadata {
  /** Extension name */
  name: string;
  /** System version (e.g., "v1") */
  systemVersion: string;
  /** Whether this is an exclusive extension */
  exclusive: boolean;
  /** Extension description */
  description?: string;
  /** Class instance */
  instance: unknown;
  /** Discovered functions */
  functions: FunctionMetadata[];
}

/**
 * Metadata for a discovered function
 */
export interface FunctionMetadata {
  /** Function name (e.g., "getAvailability" or "booking.create") */
  name: string;
  /** Full method name for routing (e.g., "extension.calendar.getAvailability") */
  fullName: string;
  /** Method name on the class */
  methodName: string | symbol;
  /** Function description */
  description?: string;
  /** Whether this function is only exposed through getTestFunctions */
  test?: boolean;
  /** Whether this function is omitted from Function discovery */
  hidden?: boolean;
  /** Input schema (Zod) */
  inputSchema?: z.ZodSchema;
  /** Output schema (Zod) */
  outputSchema?: z.ZodSchema;
  /** JSON Schema for input */
  inputJsonSchema?: Record<string, unknown>;
  /** JSON Schema for output */
  outputJsonSchema?: Record<string, unknown>;
  /** Bound handler function */
  handler: (ctx: unknown, params: unknown) => Promise<unknown>;
}
