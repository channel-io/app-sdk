import type {
  OAuthConfig,
  CredentialValidationInput,
  CredentialValidationResult,
} from "../oauth.js";
import type { Context } from "../../types/context.js";

/**
 * OAuth Extension Interface
 *
 * Implement this interface to create an OAuth-based authentication extension.
 *
 * @example
 * ```typescript
 * @Extension({ name: "oauth", systemVersion: "v1" })
 * export class MyOAuthExtension implements OAuthExtensionInterface {
 *   @Func("metadata.getAuthConfig")
 *   @OutputSchema(OAuthConfigSchema)
 *   async getAuthConfig(ctx: Context): Promise<OAuthConfig> {
 *     return {
 *       authType: "oauth",
 *       authScope: "caller",
 *       oauthProvider: {
 *         provider: "example",
 *         authorizationUrl: "https://example.com/oauth/authorize",
 *         tokenUrl: "https://example.com/oauth/token",
 *         refreshTokenUrl: "https://example.com/oauth/refresh-token",
 *         scopes: ["read", "write"],
 *         providerName: "Example",
 *         tokenRequestContentType: "json",
 *       },
 *     };
 *   }
 *
 *   @Func("validation.validateCredentials")
 *   @InputSchema(CredentialValidationInputSchema)
 *   @OutputSchema(CredentialValidationResultSchema)
 *   async validateCredentials(
 *     ctx: Context,
 *     params: CredentialValidationInput
 *   ): Promise<CredentialValidationResult> {
 *     const accessToken = ctx.authToken ?? params.accessToken;
 *     return { valid: Boolean(accessToken) };
 *   }
 * }
 * ```
 */
export interface OAuthExtensionInterface {
  /**
   * Get OAuth configuration for authorization flow
   *
   * Function name: "metadata.getAuthConfig"
   *
   * @returns OAuth configuration including auth scope and provider metadata
   */
  getAuthConfig(ctx: Context): Promise<OAuthConfig>;

  /**
   * Validate an OAuth credential (access token)
   *
   * Function name: "validation.validateCredentials"
   *
   * @param ctx - Extension context
   * @param params - Empty in AppStore calls; may contain accessToken in local tests
   * @returns Validation result with expiration info
   */
  validateCredentials(
    ctx: Context,
    params: CredentialValidationInput
  ): Promise<CredentialValidationResult>;
}

/**
 * OAuth Extension Function Names
 */
export const OAuthFunctionNames = {
  getAuthConfig: "metadata.getAuthConfig",
  validateCredentials: "validation.validateCredentials",
} as const;
