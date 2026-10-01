---
"@channel.io/app-sdk-core": patch
---

Preserve OAuth provider metadata with the standard OAuthConfigSchema: add optional oauthProvider.additionalParamsByAuthScope for channel/manager query values and authorizationRequest for standard parameter formatting and S256 PKCE. Keep the existing additionalParams string map unchanged. Requires matching platform support and metadata re-registration; does not change the platform handling of legacy additionalParams.
