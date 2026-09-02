/**
 * Extension Function Interfaces
 *
 * These interfaces define the required function signatures for each extension type.
 * Use these as a guide when implementing your extension classes.
 *
 * @example
 * ```typescript
 * import { Extension, Func, Ctx, Input, InputSchema, OutputSchema } from "@channel.io/app-sdk-server";
 * import type { CalendarExtensionInterface } from "@channel.io/app-sdk-core";
 *
 * @Extension({ name: "calendar", systemVersion: "v1" })
 * export class MyCalendarExtension implements CalendarExtensionInterface {
 *   // IDE will show required methods and their signatures
 * }
 * ```
 */

export * from "./oauth.js";
export * from "./apikey.js";
export * from "./config.js";
export * from "./calendar.js";
export * from "./command.js";
export * from "./widget.js";
export * from "./customtab.js";
export {
  HookFunctionNames,
  type GetHooksInput,
  type HookExtensionInterface,
  type UserChatOpenedHookInput,
  type UserChatOpenedHookResult,
} from "./hook.js";
export * from "./polling.js";
export * from "./store.js";
export * from "./datasource.js";
export * from "./alftask.js";
export * from "./notebook.js";
export * from "./order.js";
export * from "./wms.js";
export * from "./messaging.js";
export * from "./mail-relay.js";
