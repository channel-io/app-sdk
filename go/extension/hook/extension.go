package hook

import (
	"context"

	"github.com/channel-io/app-sdk/go/appsdk"
	extensionkit "github.com/channel-io/app-sdk/go/extension"
	"github.com/channel-io/app-sdk/go/extension/schemaregistry"
	sdkv1 "github.com/channel-io/app-sdk/go/internal/gen/channel/app/sdk/v1"
)

const (
	ExtensionName = "hook"
	SystemVersion = "v1"

	FunctionGetHooks = "extension.hook.metadata.getHooks"

	TypeAppInstalled      = "app.installed"
	TypeAppUninstalled    = "app.uninstalled"
	TypeCommandToggle     = "command.toggle"
	TypeConfigSaved       = "config.saved"
	TypeConfigDeleted     = "config.deleted"
	TypeWidgetInstalled   = "widget.installed"
	TypeWidgetUninstalled = "widget.uninstalled"
	TypeWebhookReceived   = "webhook.received"

	WebhookExecutionScopeApp     = "app"
	WebhookExecutionScopeManager = "manager"
)

type ExtensionBuilder struct {
	base *extensionkit.Builder
}

func Extension() *ExtensionBuilder {
	return &ExtensionBuilder{base: extensionkit.New(ExtensionName, extensionkit.SystemVersion(SystemVersion))}
}

func (b *ExtensionBuilder) GetHooks(handler appsdk.TypedHandlerFunc[GetHooksRequest, GetHooksResponse]) *ExtensionBuilder {
	b.base.Func(FunctionGetHooks, schemaregistry.Append(FunctionGetHooks, appsdk.HandleProto(handler))...)
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

func StaticHooks(hooks ...*Config) appsdk.TypedHandlerFunc[GetHooksRequest, GetHooksResponse] {
	return func(context.Context, appsdk.Context, *GetHooksRequest) (*GetHooksResponse, error) {
		return &GetHooksResponse{Hooks: hooks}, nil
	}
}

type GetHooksRequest = sdkv1.HookGetHooksInput
type GetHooksResponse = sdkv1.HookGetHooksOutput
type Config = sdkv1.HookConfig
type WebhookConfig = sdkv1.HookWebhookConfig
