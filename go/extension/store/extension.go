package store

import (
	"context"

	"github.com/channel-io/app-sdk/go/appsdk"
	extensionkit "github.com/channel-io/app-sdk/go/extension"
	"github.com/channel-io/app-sdk/go/extension/schemaregistry"
	sdkv1 "github.com/channel-io/app-sdk/go/internal/gen/channel/app/sdk/v1"
)

const (
	ExtensionName = "store"
	SystemVersion = "v1"

	FunctionGetStoreProfile = "extension.store.metadata.getStoreProfile"
)

type ExtensionBuilder struct {
	base *extensionkit.Builder
}

func Extension() *ExtensionBuilder {
	return &ExtensionBuilder{base: extensionkit.New(ExtensionName, extensionkit.SystemVersion(SystemVersion))}
}

func (b *ExtensionBuilder) GetStoreProfile(handler appsdk.TypedHandlerFunc[GetStoreProfileRequest, GetStoreProfileResponse]) *ExtensionBuilder {
	b.base.Func(FunctionGetStoreProfile, schemaregistry.Append(FunctionGetStoreProfile, appsdk.HandleProto(handler))...)
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

// StaticProfile returns metadata for the extension source. Root is optional and distinct from
// I18NMap locales. Empty localized arrays and intro strings intentionally leave those fields
// available for an App Store Developer GUI fallback.
func StaticProfile(profile *Profile) appsdk.TypedHandlerFunc[GetStoreProfileRequest, GetStoreProfileResponse] {
	return func(context.Context, appsdk.Context, *GetStoreProfileRequest) (*GetStoreProfileResponse, error) {
		return profile, nil
	}
}

type GetStoreProfileRequest = sdkv1.StoreGetProfileInput
type GetStoreProfileResponse = sdkv1.StoreGetProfileOutput
type Profile = sdkv1.StoreGetProfileOutput
type Image = sdkv1.StoreProfileImage
type Intro = sdkv1.StoreProfileIntro
type LocalizedContent = sdkv1.StoreProfileLocalizedContent
type FAQ = sdkv1.StoreFaq
type ProfileI18n = sdkv1.StoreProfileLocalizedContent
