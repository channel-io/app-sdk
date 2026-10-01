---
"@channel.io/app-sdk-core": patch
---

Preserve OAuth provider authorizationRequest metadata in the public schemas and generated contracts, including S256 PKCE, authorization query formatting, and additionalParamsByAuthScope for channel and manager credential targets. Apps can use the standard OAuthConfigSchema without a local schema extension. Requires corresponding platform support and OAuth metadata re-registration; this does not change handling of the legacy oauthProvider.additionalParams field.
