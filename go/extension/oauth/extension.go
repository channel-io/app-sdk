package oauth

import (
	"context"

	"github.com/channel-io/app-sdk/go/appsdk"
	extensionkit "github.com/channel-io/app-sdk/go/extension"
	"github.com/channel-io/app-sdk/go/extension/schemaregistry"
	sdkv1 "github.com/channel-io/app-sdk/go/internal/gen/channel/app/sdk/v1"
)

const (
	ExtensionName = "oauth"
	SystemVersion = "v1"

	FunctionGetAuthConfig       = "extension.oauth.metadata.getAuthConfig"
	FunctionValidateCredentials = "extension.oauth.validation.validateCredentials"

	AuthTypeOAuth = "oauth"
	ScopeChannel  = "channel"
	ScopeManager  = "manager"
	ScopeCaller   = "caller"

	ParameterCaseSnake = "snake"
	ParameterCaseCamel = "camel"

	TokenRequestContentTypeForm = "form"
	TokenRequestContentTypeJSON = "json"

	AuthorizationOpenModePopup      = "popup"
	AuthorizationOpenModeCurrentTab = "currentTab"
)

type ExtensionBuilder struct {
	base *extensionkit.Builder
}

func Extension() *ExtensionBuilder {
	return &ExtensionBuilder{base: extensionkit.New(ExtensionName, extensionkit.SystemVersion(SystemVersion))}
}

func (b *ExtensionBuilder) GetAuthConfig(handler appsdk.TypedHandlerFunc[GetAuthConfigRequest, AuthConfig]) *ExtensionBuilder {
	b.base.Func(FunctionGetAuthConfig, schemaregistry.Append(FunctionGetAuthConfig, appsdk.HandleProto(handler))...)
	return b
}

func (b *ExtensionBuilder) ValidateCredentials(handler appsdk.TypedHandlerFunc[CredentialValidationInput, CredentialValidationResult]) *ExtensionBuilder {
	b.base.Func(FunctionValidateCredentials, schemaregistry.Append(FunctionValidateCredentials, appsdk.HandleProto(handler))...)
	return b
}

func (b *ExtensionBuilder) Function(name string, opts ...appsdk.FunctionOption) *ExtensionBuilder {
	b.base.Func(name, opts...)
	return b
}

func (b *ExtensionBuilder) ExtensionFunction(name string, opts ...appsdk.FunctionOption) *ExtensionBuilder {
	b.base.ExtensionFunc(name, opts...)
	return b
}

func (b *ExtensionBuilder) Register(app *appsdk.App) error {
	return b.base.Register(app)
}

func StaticAuthConfig(config *AuthConfig) appsdk.TypedHandlerFunc[GetAuthConfigRequest, AuthConfig] {
	return func(context.Context, appsdk.Context, *GetAuthConfigRequest) (*AuthConfig, error) {
		return config, nil
	}
}

func Valid() *CredentialValidationResult {
	return &CredentialValidationResult{Valid: true}
}

func Invalid(message string) *CredentialValidationResult {
	return &CredentialValidationResult{Valid: false, Error: message}
}

type GetAuthConfigRequest = sdkv1.OAuthGetAuthConfigInput
type AuthConfig = sdkv1.OAuthConfig
type Provider = sdkv1.OAuthProvider
type ProviderLocalizedText = sdkv1.OAuthProviderLocalizedText
type TokenRequestMapping = sdkv1.OAuthTokenRequestMapping
type TokenResponseMapping = sdkv1.OAuthTokenResponseMapping
type CredentialValidationInput = sdkv1.OAuthCredentialValidationInput
type CredentialValidationResult = sdkv1.OAuthCredentialValidationResult

const (
	LocaleKO = "ko"
	LocaleJA = "ja"
	LocaleEN = "en"
)
