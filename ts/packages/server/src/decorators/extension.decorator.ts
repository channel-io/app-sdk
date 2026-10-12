import { Injectable, SetMetadata } from "@nestjs/common";
import { SDK_EXTENSION_NAMES, type SdkExtensionName } from "./extension-names.js";

export const EXTENSION_METADATA = Symbol("EXTENSION_METADATA");

export interface ExtensionOptions {
  /** Extension name (e.g., "calendar", "oauth") */
  name: string;
  /** System version (default: "v1") */
  systemVersion?: string;
  /** Whether this is an exclusive extension */
  exclusive?: boolean;
  /** Description of the extension */
  description?: string;
}

/**
 * Marks a class as a Channel.io App Extension
 *
 * @example
 * ```typescript
 * @Extension("calendar")
 * export class CalendarExtension {
 *   @Function("getAvailability")
 *   async getAvailability(@Ctx() ctx, @Input() params) {
 *     return { slots: [] };
 *   }
 * }
 * ```
 *
 * @example with options
 * ```typescript
 * @Extension({ name: "calendar", systemVersion: "v1", exclusive: true })
 * export class CalendarExtension { ... }
 * ```
 */
export function Extension(
  nameOrOptions: SdkExtensionName | (ExtensionOptions & { name: SdkExtensionName })
): ClassDecorator {
  const options: ExtensionOptions =
    typeof nameOrOptions === "string" ? { name: nameOrOptions } : nameOrOptions;

  if (!(SDK_EXTENSION_NAMES as readonly string[]).includes(options.name)) {
    throw new Error(
      `@Extension name "${options.name}" is not a valid SDK extension name. ` +
        `Valid: ${SDK_EXTENSION_NAMES.join(", ")}. For custom functions, use @Func() directly.`
    );
  }

  return decorateExtension(options);
}

/**
 * Creates a decorator for an explicitly named extension contract supplied by another package.
 * The platform must support and authorize that contract before registration can succeed.
 * This does not add the name to the built-in SDK catalog or grant any permissions.
 */
export function createExtensionDecorator(name: string) {
  if (typeof name !== "string" || !/^[A-Za-z][A-Za-z0-9_-]*$/.test(name)) {
    throw new Error("Extension name must be a single non-empty identifier.");
  }
  return (options: Omit<ExtensionOptions, "name"> = {}): ClassDecorator =>
    decorateExtension({ ...options, name });
}

function decorateExtension(options: ExtensionOptions): ClassDecorator {
  return (target) => {
    SetMetadata(EXTENSION_METADATA, {
      name: options.name,
      systemVersion: options.systemVersion ?? "v1",
      exclusive: options.exclusive ?? false,
      description: options.description,
    })(target);

    // Apply @Injectable() decorator automatically
    Injectable()(target);
  };
}
