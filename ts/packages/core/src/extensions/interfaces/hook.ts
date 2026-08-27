import type { GetHooksOutput } from "../hook.js";
export type { UserChatOpenedHookInput, UserChatOpenedHookResult } from "../hook.js";
import type { Context } from "../../types/context.js";
import type { HookGetHooksInput as ProtoGetHooksInput } from "../../gen/channel/app/sdk/v1/extension.js";

/**
 * Hook metadata input/output types
 */
export type GetHooksInput = ProtoGetHooksInput;

/**
 * Hook metadata extension interface
 *
 * Implement this interface to expose hook definitions for AppStore registration.
 * Hook handlers themselves are plain app functions referenced by each hook's
 * `actionFunctionName`.
 *
 * @example
 * ```typescript
 * @Extension({ name: "hook", systemVersion: "v1" })
 * export class MyHookExtension implements HookExtensionInterface {
 *   @Func("metadata.getHooks")
 *   async getHooks(ctx, params): Promise<GetHooksOutput> {
 *     return {
 *       hooks: [
 *         {
 *           type: "app.installed",
 *           actionFunctionName: "hooks.lifecycle.onAppInstalled",
 *         },
 *         {
 *           type: "widget.installed",
 *           targetId: "quick_actions",
 *           actionFunctionName: "hooks.widgets.onQuickActionsInstalled",
 *         },
 *       ],
 *     };
 *   }
 * }
 * ```
 */
export interface HookExtensionInterface {
  /**
   * Get hook definitions for AppStore registration
   *
   * Function name: "metadata.getHooks"
   */
  getHooks(ctx: Context, params: GetHooksInput): Promise<GetHooksOutput>;
}

/**
 * Hook Extension Function Names
 */
export const HookFunctionNames = {
  getHooks: "metadata.getHooks",
} as const;
