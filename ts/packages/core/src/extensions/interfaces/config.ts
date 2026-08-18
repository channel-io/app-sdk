import type { GetConfigSchemaOutput, ValidateStoredConfigOutput } from "../config.js";
import type { Context } from "../../types/context.js";

/**
 * Config Extension Interface
 *
 * Implement this interface when your app needs to expose a layout-aware setup
 * surface that stores scoped config and/or credentials in AppStore.
 * Fields with `storageClass: "transient"` are intended for draft-only inputs
 * such as file/image uploads that should be handled by hooks and not persisted
 * as config values.
 * Image fields with `storageClass: "media"` persist only a media reference
 * object after AppStore uploads the file to the media server.
 * `oauth.additionalParams` can map persisted config fields to OAuth provider
 * parameters that are needed during authorization and token refresh.
 *
 * @example
 * ```typescript
 * @Extension({ name: "config", systemVersion: "v1" })
 * export class MyConfigExtension implements ConfigExtensionInterface {
 *   @Func("metadata.getConfigSchema")
 *   @OutputSchema(GetConfigSchemaOutputSchema)
 *   async getConfigSchema(_ctx: Context): Promise<GetConfigSchemaOutput> {
 *     return {
 *       schemaVersion: "v1",
 *       configScope: "channel",
 *       providerName: "My Provider",
 *       oauth: {
 *         additionalParams: [{ name: "domain", fieldKey: "domain" }],
 *       },
 *       hooks: {
 *         draftResolverFunctionName: "myConfig.resolveDraft",
 *         validateFunctionName: "myConfig.validate",
 *       },
 *       blocks: [
 *         {
 *           type: "text",
 *           key: "storeId",
 *           label: "Store ID",
 *           required: true,
 *         },
 *       ],
 *     };
 *   }
 *
 *   @Func("validation.validateStoredConfig")
 *   @OutputSchema(ValidateStoredConfigOutputSchema)
 *   async validateStoredConfig(_ctx: Context): Promise<ValidateStoredConfigOutput> {
 *     return { valid: true };
 *   }
 * }
 * ```
 */
export interface ConfigExtensionInterface {
  /**
   * Return layout-aware config schema for the provider.
   *
   * Function name: "metadata.getConfigSchema"
   *
   * Optional `hooks` may reference ordinary app functions such as
   * `draftResolverFunctionName` and `validateFunctionName`.
   *
   * `draftResolverFunctionName` receives ordinary params describing the field
   * change and can return partial value or choice patches. Select-like fields
   * can also declare `choicesSource` to let AppStore populate options through
   * an app function or native function. `validateFunctionName` is invoked during
   * stored config validation with canonical values resolved in `ctx.config`.
   * Validation output may also include `notices` that AppStore can render at the
   * top of the setup WAM or near a specific block via `blockId`.
   */
  getConfigSchema(ctx: Context): Promise<GetConfigSchemaOutput>;

  /**
   * Validate already stored config values resolved by AppStore.
   *
   * Function name: "validation.validateStoredConfig"
   */
  validateStoredConfig?(ctx: Context): Promise<ValidateStoredConfigOutput>;
}

/**
 * Config Extension Function Names
 */
export const ConfigFunctionNames = {
  getConfigSchema: "metadata.getConfigSchema",
  validateStoredConfig: "validation.validateStoredConfig",
} as const;
