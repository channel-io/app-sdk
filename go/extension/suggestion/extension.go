package suggestion

import (
	"context"
	"encoding/json"
	"errors"

	"github.com/channel-io/app-sdk/go/appsdk"
	extensionkit "github.com/channel-io/app-sdk/go/extension"
	"github.com/channel-io/app-sdk/go/extension/schemaregistry"
	sdkv1 "github.com/channel-io/app-sdk/go/internal/gen/channel/app/sdk/v1"
	"google.golang.org/protobuf/encoding/protojson"
	"google.golang.org/protobuf/types/known/structpb"
)

const (
	ExtensionName = "suggestion"
	SystemVersion = "v1"

	FunctionGetTriggers = "extension.suggestion.metadata.getTriggers"
)

type ExtensionBuilder struct {
	base *extensionkit.Builder
}

func Extension() *ExtensionBuilder {
	return &ExtensionBuilder{base: extensionkit.New(ExtensionName, extensionkit.SystemVersion(SystemVersion))}
}

func (b *ExtensionBuilder) GetTriggers(handler appsdk.TypedHandlerFunc[GetTriggersRequest, GetTriggersResponse]) *ExtensionBuilder {
	b.base.Func(FunctionGetTriggers, schemaregistry.Append(FunctionGetTriggers, handleGetTriggers(handler))...)
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

// NewTriggers converts the public locale-to-keyword-list shape into its Proto JSON representation.
func NewTriggers(urls []string, keywords map[string][]string) (*Triggers, error) {
	values := make(map[string]any, len(keywords))
	for locale, entries := range keywords {
		items := make([]any, len(entries))
		for i, entry := range entries {
			items[i] = entry
		}
		values[locale] = items
	}
	keywordStruct, err := structpb.NewStruct(values)
	if err != nil {
		return nil, err
	}
	return &Triggers{Urls: urls, Keywords: keywordStruct}, nil
}

func StaticTriggers(triggers *Triggers) appsdk.TypedHandlerFunc[GetTriggersRequest, GetTriggersResponse] {
	return func(context.Context, appsdk.Context, *GetTriggersRequest) (*GetTriggersResponse, error) {
		if triggers == nil {
			return nil, errors.New("suggestion triggers are required")
		}
		return &GetTriggersResponse{Triggers: triggers}, nil
	}
}

type getTriggersResult struct {
	response *GetTriggersResponse
}

// MarshalSDKResult preserves the required empty trigger collections without changing other Proto handlers.
func (r *getTriggersResult) MarshalSDKResult() (json.RawMessage, error) {
	data, err := (protojson.MarshalOptions{EmitUnpopulated: true}).Marshal(r.response)
	if err != nil {
		return nil, err
	}
	return data, nil
}

// handleGetTriggers applies suggestion-specific Proto JSON serialization to the public handler.
func handleGetTriggers(handler appsdk.TypedHandlerFunc[GetTriggersRequest, GetTriggersResponse]) appsdk.FunctionOption {
	return appsdk.HandleProto(func(
		ctx context.Context,
		fnCtx appsdk.Context,
		input *GetTriggersRequest,
	) (*getTriggersResult, error) {
		response, err := handler(ctx, fnCtx, input)
		if err != nil || response == nil {
			return nil, err
		}
		return &getTriggersResult{response: response}, nil
	})
}

type GetTriggersRequest = sdkv1.SuggestionGetTriggersInput
type GetTriggersResponse = sdkv1.SuggestionGetTriggersOutput
type Triggers = sdkv1.SuggestionTriggers
