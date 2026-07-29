import type { Context } from "../../types/context.js";
import type { PollingGetPollersInput as ProtoGetPollersInput } from "../../gen/channel/app/sdk/v1/extension.js";
import type {
  GetPollersOutput,
  GetPollingTargetManagersInput,
  GetPollingTargetManagersOutput,
  GetPollingTargetChannelsInput,
  GetPollingTargetChannelsOutput,
} from "../polling.js";

/**
 * Polling metadata input/output types.
 */
export type GetPollersInput = ProtoGetPollersInput;

/**
 * Polling extension interface.
 *
 * Implement this interface to let AppStore schedule app functions through the
 * shared polling pipeline. Polling functions themselves are plain app functions
 * referenced by each poller's full `functionName`.
 *
 * @example
 * ```typescript
 * @Extension({ name: "polling", systemVersion: "v1" })
 * export class MyPollingExtension implements PollingExtensionInterface {
 *   @Func("metadata.getPollers")
 *   async getPollers(
 *     ctx: Context,
 *     params: GetPollersInput
 *   ): Promise<GetPollersOutput> {
 *     return {
 *       pollers: [
 *         {
 *           functionName: "extension.polling.poller.pollQnAs",
 *           intervalSeconds: 900,
 *           timeoutSeconds: 30,
 *           maxConcurrency: 5,
 *           rps: 1,
 *           executionScope: "channel",
 *         },
 *         {
 *           functionName: "extension.polling.poller.pollCalendars",
 *           intervalSeconds: 3600,
 *           executionScope: "manager",
 *         },
 *       ],
 *     };
 *   }
 *
 *   @Func("target.getChannels")
 *   async getChannels(
 *     ctx: Context,
 *     params: GetPollingTargetChannelsInput
 *   ): Promise<GetPollingTargetChannelsOutput> {
 *     return { channelIds: [], nextCursor: undefined };
 *   }
 *
 *   @Func("target.getManagers")
 *   async getManagers(
 *     ctx: Context,
 *     params: GetPollingTargetManagersInput
 *   ): Promise<GetPollingTargetManagersOutput> {
 *     return { targets: [], nextCursor: undefined };
 *   }
 * }
 * ```
 */
export interface PollingExtensionInterface {
  /**
   * Get polling handler definitions for AppStore registration.
   *
   * Function name: "metadata.getPollers"
   */
  getPollers(ctx: Context, params: GetPollersInput): Promise<GetPollersOutput>;

  /**
   * Return the target channel page for a polling handler.
   *
   * Function name: "target.getChannels"
   */
  getChannels?(
    ctx: Context,
    params: GetPollingTargetChannelsInput
  ): Promise<GetPollingTargetChannelsOutput>;

  /**
   * Return the target channel/manager page for a manager-scoped polling handler.
   *
   * Function name: "target.getManagers"
   */
  getManagers?(
    ctx: Context,
    params: GetPollingTargetManagersInput
  ): Promise<GetPollingTargetManagersOutput>;
}

/**
 * Polling extension function names.
 */
export const PollingFunctionNames = {
  getPollers: "metadata.getPollers",
  getChannels: "target.getChannels",
  getManagers: "target.getManagers",
} as const;
