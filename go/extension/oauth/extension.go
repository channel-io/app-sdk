package oauth

import (
	"context"
	"encoding/json"
	"fmt"

	"github.com/channel-io/app-sdk/go/appsdk"
	extensionkit "github.com/channel-io/app-sdk/go/extension"
	"github.com/channel-io/app-sdk/go/extension/schemaregistry"
	sdkv1 "github.com/channel-io/app-sdk/go/internal/gen/channel/app/sdk/v1"
	"google.golang.org/protobuf/encoding/protojson"
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
	handlerOption := appsdk.HandleProtoInput(func(ctx context.Context, fnCtx appsdk.Context, input *GetAuthConfigRequest) (any, error) {
		result, err := handler(ctx, fnCtx, input)
		if err != nil {
			return nil, err
		}
		if err := extensionkit.ValidateOAuthStepDisplay(result.GetOauthProvider().GetAuthorizationDisplay()); err != nil {
			return nil, err
		}
		return marshalAuthConfig(result)
	})
	// Restore canonical input/output schemas after HandleProtoInput supplies its inferred input.
	b.base.Func(FunctionGetAuthConfig, append([]appsdk.FunctionOption{handlerOption}, schemaregistry.FunctionOptions(FunctionGetAuthConfig)...)...)
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
		return config, extensionkit.ValidateOAuthStepDisplay(config.GetOauthProvider().GetAuthorizationDisplay())
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
type ScopedParamValue = sdkv1.OAuthScopedParamValue
type AuthorizationRequestMapping = sdkv1.OAuthAuthorizationRequestMapping
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

type OAuthStepDisplay = sdkv1.OAuthStepDisplay
type OAuthStepLocalizedText = sdkv1.OAuthStepLocalizedText

const (
	OAuthStepIconInstallation = "installation"
	OAuthStepIconAccount      = "account"
	OAuthStepIconOrganization = "organization"
	OAuthStepIconPermission   = "permission"
	OAuthStepIconSettings     = "settings"
)

// marshalAuthConfig projects the binary-compatible Proto representation to metadata JSON.
// It never mutates the caller's config and rejects ambiguous common/scoped duplicates.
func marshalAuthConfig(config *AuthConfig) (json.RawMessage, error) {
	if config == nil {
		return json.RawMessage(`{}`), nil
	}
	encoded, err := protojson.Marshal(config)
	if err != nil {
		return nil, err
	}
	if len(config.GetOauthProvider().GetScopedAdditionalParams()) == 0 {
		return encoded, nil
	}
	var wire map[string]json.RawMessage
	if err := json.Unmarshal(encoded, &wire); err != nil {
		return nil, err
	}
	var provider map[string]json.RawMessage
	if err := json.Unmarshal(wire["oauthProvider"], &provider); err != nil {
		return nil, err
	}
	params := map[string]json.RawMessage{}
	if raw := provider["additionalParams"]; len(raw) > 0 {
		if err := json.Unmarshal(raw, &params); err != nil {
			return nil, err
		}
	}
	scoped := map[string]json.RawMessage{}
	if err := json.Unmarshal(provider["scopedAdditionalParams"], &scoped); err != nil {
		return nil, err
	}
	for name, value := range scoped {
		if _, exists := params[name]; exists {
			return nil, fmt.Errorf("OAuth parameter %q has both common and scoped values", name)
		}
		params[name] = value
	}
	delete(provider, "scopedAdditionalParams")
	provider["additionalParams"], err = json.Marshal(params)
	if err != nil {
		return nil, err
	}
	wire["oauthProvider"], err = json.Marshal(provider)
	if err != nil {
		return nil, err
	}
	return json.Marshal(wire)
}
