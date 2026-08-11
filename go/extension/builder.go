package extension

import (
	"context"
	"strings"

	"github.com/channel-io/app-sdk/go/appsdk"
	sdkv1 "github.com/channel-io/app-sdk/go/internal/gen/channel/app/sdk/v1"
)

type Empty = sdkv1.ExtensionEmptyInput

type Option func(*Builder)

type Builder struct {
	name          string
	systemVersion string
	registrations []func(*appsdk.App) error
}

func New(name string, opts ...Option) *Builder {
	b := &Builder{
		name:          name,
		systemVersion: appsdk.DefaultSystemVersion,
	}
	for _, opt := range opts {
		if opt != nil {
			opt(b)
		}
	}
	return b
}

func SystemVersion(version string) Option {
	return func(b *Builder) {
		if version != "" {
			b.systemVersion = version
		}
	}
}

func FullName(extensionName string, functionName string) string {
	functionName = strings.TrimSpace(functionName)
	if strings.HasPrefix(functionName, "extension.") {
		return functionName
	}
	return "extension." + extensionName + "." + strings.TrimPrefix(functionName, ".")
}

func (b *Builder) Name() string {
	return b.name
}

func (b *Builder) SystemVersion() string {
	return b.systemVersion
}

func (b *Builder) Func(name string, opts ...appsdk.FunctionOption) *Builder {
	b.registrations = append(b.registrations, func(app *appsdk.App) error {
		versionedOpts := append([]appsdk.FunctionOption{}, opts...)
		versionedOpts = append(versionedOpts, appsdk.SystemVersion(b.systemVersion))
		return app.RegisterFunc(name, versionedOpts...)
	})
	return b
}

func (b *Builder) ExtensionFunc(name string, opts ...appsdk.FunctionOption) *Builder {
	return b.Func(FullName(b.name, name), opts...)
}

func (b *Builder) Register(app *appsdk.App) error {
	if err := app.DeclareExtension(b.name, b.systemVersion); err != nil {
		return err
	}
	for _, register := range b.registrations {
		if err := register(app); err != nil {
			return err
		}
	}
	return nil
}

func Static[TOut any](value TOut) appsdk.TypedHandlerFunc[Empty, TOut] {
	return func(context.Context, appsdk.Context, *Empty) (*TOut, error) {
		return &value, nil
	}
}

func StaticInput[TIn any, TOut any](value TOut) appsdk.TypedHandlerFunc[TIn, TOut] {
	return func(context.Context, appsdk.Context, *TIn) (*TOut, error) {
		return &value, nil
	}
}
