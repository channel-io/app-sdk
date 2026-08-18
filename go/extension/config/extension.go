package config

import (
	"context"

	"github.com/channel-io/app-sdk/go/appsdk"
	extensionkit "github.com/channel-io/app-sdk/go/extension"
	"github.com/channel-io/app-sdk/go/extension/schemaregistry"
	sdkv1 "github.com/channel-io/app-sdk/go/internal/gen/channel/app/sdk/v1"
)

const (
	ExtensionName = "config"
	SystemVersion = "v1"

	FunctionGetConfigSchema      = "extension.config.metadata.getConfigSchema"
	FunctionValidateStoredConfig = "extension.config.validation.validateStoredConfig"

	ScopeChannel = "channel"
	ScopeManager = "manager"

	StorageClassConfig     = "config"
	StorageClassCredential = "credential"
	StorageClassTransient  = "transient"
	StorageClassMedia      = "media"

	MaskTypeFull    = "full"
	MaskTypePartial = "partial"

	FieldTypeText        = "text"
	FieldTypeTextArea    = "textarea"
	FieldTypePassword    = "password"
	FieldTypeNumber      = "number"
	FieldTypeSelect      = "select"
	FieldTypeMultiSelect = "multiselect"
	FieldTypeRadio       = "radio"
	FieldTypeCheckbox    = "checkbox"
	FieldTypeSwitch      = "switch"
	FieldTypePhone       = "phone"
	FieldTypeAddress     = "address"
	FieldTypeImage       = "image"

	BlockTypeSection     = "section"
	BlockTypeDescription = "description"
	BlockTypeDivider     = "divider"
	BlockTypeBanner      = "banner"
	BlockTypeGroup       = "group"
	BlockTypeNative      = "native"
)

type ExtensionBuilder struct {
	base *extensionkit.Builder
}

func Extension() *ExtensionBuilder {
	return &ExtensionBuilder{base: extensionkit.New(ExtensionName, extensionkit.SystemVersion(SystemVersion))}
}

func (b *ExtensionBuilder) GetConfigSchema(handler appsdk.TypedHandlerFunc[GetConfigSchemaRequest, GetConfigSchemaResponse]) *ExtensionBuilder {
	b.base.Func(FunctionGetConfigSchema, schemaregistry.Append(FunctionGetConfigSchema, appsdk.HandleProto(handler))...)
	return b
}

func (b *ExtensionBuilder) ValidateStoredConfig(handler appsdk.TypedHandlerFunc[ValidateStoredConfigRequest, ValidateStoredConfigResponse]) *ExtensionBuilder {
	b.base.Func(FunctionValidateStoredConfig, schemaregistry.Append(FunctionValidateStoredConfig, appsdk.HandleProto(handler))...)
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

func StaticSchema(schema *GetConfigSchemaResponse) appsdk.TypedHandlerFunc[GetConfigSchemaRequest, GetConfigSchemaResponse] {
	return func(context.Context, appsdk.Context, *GetConfigSchemaRequest) (*GetConfigSchemaResponse, error) {
		return schema, nil
	}
}

func Valid() *ValidateStoredConfigResponse {
	return &ValidateStoredConfigResponse{Valid: true}
}

func Invalid(message string) *ValidateStoredConfigResponse {
	return &ValidateStoredConfigResponse{
		Valid:   false,
		Message: message,
	}
}

func ValuesFrom(fnCtx appsdk.Context) map[string]any {
	values := make(map[string]any, len(fnCtx.Config))
	for key, value := range fnCtx.Config {
		values[key] = value
	}
	return values
}

func StringValuesFrom(fnCtx appsdk.Context) map[string]string {
	values := make(map[string]string, len(fnCtx.Config))
	for key, value := range fnCtx.Config {
		if stringValue, ok := value.(string); ok {
			values[key] = stringValue
		}
	}
	return values
}

func CredentialsFrom(fnCtx appsdk.Context) map[string]string {
	credentials := make(map[string]string, len(fnCtx.APICredentials)+len(fnCtx.Config))
	for key, value := range fnCtx.APICredentials {
		credentials[key] = value
	}
	for key, value := range StringValuesFrom(fnCtx) {
		credentials[key] = value
	}
	return credentials
}

type GetConfigSchemaRequest = sdkv1.ConfigGetConfigSchemaInput
type GetConfigSchemaResponse = sdkv1.ConfigGetConfigSchemaOutput
type OAuthConfig = sdkv1.ConfigOAuth
type OAuthAdditionalParam = sdkv1.ConfigOAuthAdditionalParam
type OAuthClientCredentials = sdkv1.ConfigOAuthClientCredentials
type Hooks = sdkv1.ConfigHooks
type Condition = sdkv1.ConfigCondition
type LocalizedText = sdkv1.ConfigLocalizedText
type I18nMap = map[string]*sdkv1.ConfigLocalizedText
type Choice = sdkv1.ConfigChoice
type InlineLink = sdkv1.ConfigInlineLink
type ChoicesSource = sdkv1.ConfigChoicesSource
type Overview = sdkv1.ConfigOverview
type DefaultSelector = sdkv1.ConfigDefaultSelector
type Settings = sdkv1.ConfigSettings
type MediaOptions = sdkv1.ConfigMediaOptions
type ResolvedValueTarget = sdkv1.ConfigResolvedValueTarget
type PhoneFieldLabels = sdkv1.ConfigPhoneFieldLabels
type AddressFieldLabels = sdkv1.ConfigAddressFieldLabels
type Field = sdkv1.ConfigField
type Block = sdkv1.ConfigBlock
type ValidateStoredConfigRequest = sdkv1.ConfigValidateStoredConfigInput
type ValidateStoredConfigResponse = sdkv1.ConfigValidateStoredConfigOutput
type ValidationError = sdkv1.ConfigValidationError
type Notice = sdkv1.ConfigValidationNotice
type ChoiceList = sdkv1.ConfigChoiceList
type DraftResolutionParams = sdkv1.ConfigDraftResolutionParams
type DraftResolutionOutput = sdkv1.ConfigDraftResolutionOutput

const (
	LocaleKO = "ko"
	LocaleJA = "ja"
	LocaleEN = "en"
)
