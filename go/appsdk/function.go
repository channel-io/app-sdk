package appsdk

import (
	"context"
	"encoding/json"
	"fmt"
	"strings"

	"github.com/channel-io/app-sdk/go/schema"
	"google.golang.org/protobuf/encoding/protojson"
	"google.golang.org/protobuf/proto"
)

type HandlerFunc func(ctx context.Context, fnCtx Context, params json.RawMessage) (json.RawMessage, error)

type TypedHandlerFunc[TIn any, TOut any] func(ctx context.Context, fnCtx Context, input *TIn) (*TOut, error)

type InputHandlerFunc[TIn any] func(ctx context.Context, fnCtx Context, input *TIn) (any, error)

type Validator interface {
	Validate() error
}

type ErrorMapper func(error) error

type FunctionOption func(*functionDefinition) error

type functionDefinition struct {
	schema                     FunctionSchema
	handler                    HandlerFunc
	errorMapper                ErrorMapper
	systemVersion              string
	systemVersionExplicitlySet bool
	test                       bool
	hidden                     bool
}

func Register[TIn any, TOut any](app *App, name string, handler TypedHandlerFunc[TIn, TOut], opts ...FunctionOption) error {
	options := []FunctionOption{
		Input[TIn](),
		Output[TOut](),
		Handle(handler),
	}
	options = append(options, opts...)
	return app.RegisterFunc(name, options...)
}

func RegisterProto[TIn any, TOut any](app *App, name string, handler TypedHandlerFunc[TIn, TOut], opts ...FunctionOption) error {
	options := ProtoHandler(handler)
	options = append(options, opts...)
	return app.RegisterFunc(name, options...)
}

func MustRegister[TIn any, TOut any](app *App, name string, handler TypedHandlerFunc[TIn, TOut], opts ...FunctionOption) {
	if err := Register(app, name, handler, opts...); err != nil {
		panic(err)
	}
}

func MustRegisterProto[TIn any, TOut any](app *App, name string, handler TypedHandlerFunc[TIn, TOut], opts ...FunctionOption) {
	if err := RegisterProto(app, name, handler, opts...); err != nil {
		panic(err)
	}
}

func RegisterTest[TIn any, TOut any](app *App, name string, handler TypedHandlerFunc[TIn, TOut], opts ...FunctionOption) error {
	opts = append([]FunctionOption{TestOnly()}, opts...)
	return Register(app, name, handler, opts...)
}

func RegisterProtoTest[TIn any, TOut any](app *App, name string, handler TypedHandlerFunc[TIn, TOut], opts ...FunctionOption) error {
	opts = append([]FunctionOption{TestOnly()}, opts...)
	return RegisterProto(app, name, handler, opts...)
}

func MustRegisterTest[TIn any, TOut any](app *App, name string, handler TypedHandlerFunc[TIn, TOut], opts ...FunctionOption) {
	if err := RegisterTest(app, name, handler, opts...); err != nil {
		panic(err)
	}
}

func MustRegisterProtoTest[TIn any, TOut any](app *App, name string, handler TypedHandlerFunc[TIn, TOut], opts ...FunctionOption) {
	if err := RegisterProtoTest(app, name, handler, opts...); err != nil {
		panic(err)
	}
}

func RegisterInput[TIn any](app *App, name string, handler InputHandlerFunc[TIn], opts ...FunctionOption) error {
	options := []FunctionOption{
		Input[TIn](),
		HandleInput(handler),
	}
	options = append(options, opts...)
	return app.RegisterFunc(name, options...)
}

func RegisterProtoInput[TIn any](app *App, name string, handler InputHandlerFunc[TIn], opts ...FunctionOption) error {
	options := []FunctionOption{
		Input[TIn](),
		HandleProtoInput(handler),
	}
	options = append(options, opts...)
	return app.RegisterFunc(name, options...)
}

func MustRegisterInput[TIn any](app *App, name string, handler InputHandlerFunc[TIn], opts ...FunctionOption) {
	if err := RegisterInput(app, name, handler, opts...); err != nil {
		panic(err)
	}
}

func MustRegisterProtoInput[TIn any](app *App, name string, handler InputHandlerFunc[TIn], opts ...FunctionOption) {
	if err := RegisterProtoInput(app, name, handler, opts...); err != nil {
		panic(err)
	}
}

func Description(description string) FunctionOption {
	return func(def *functionDefinition) error {
		def.schema.Description = description
		return nil
	}
}

// SystemVersion associates a standalone Function with an AppStore system
// contract version. Extension builders apply their own system version
// automatically. Omitting this option registers the Function for v1.
func SystemVersion(version string) FunctionOption {
	return func(def *functionDefinition) error {
		version = strings.TrimSpace(version)
		if version == "" {
			return fmt.Errorf("system version is required")
		}
		if def.systemVersionExplicitlySet && def.systemVersion != version {
			return fmt.Errorf(
				"conflicting system versions: %s and %s",
				def.systemVersion,
				version,
			)
		}
		def.systemVersion = version
		def.systemVersionExplicitlySet = true
		return nil
	}
}

func TestOnly() FunctionOption {
	return func(def *functionDefinition) error {
		def.test = true
		return nil
	}
}

func Hidden() FunctionOption {
	return func(def *functionDefinition) error {
		def.hidden = true
		return nil
	}
}

func Input[T any]() FunctionOption {
	return func(def *functionDefinition) error {
		def.schema.InputSchema = schema.For[T]()
		return nil
	}
}

func Output[T any]() FunctionOption {
	return func(def *functionDefinition) error {
		def.schema.OutputSchema = schema.For[T]()
		return nil
	}
}

func ProtoHandler[TIn any, TOut any](handler TypedHandlerFunc[TIn, TOut]) []FunctionOption {
	return []FunctionOption{
		Input[TIn](),
		Output[TOut](),
		HandleProto(handler),
	}
}

func InputSchema(input map[string]any) FunctionOption {
	return func(def *functionDefinition) error {
		def.schema.InputSchema = input
		return nil
	}
}

func OutputSchema(output map[string]any) FunctionOption {
	return func(def *functionDefinition) error {
		def.schema.OutputSchema = output
		return nil
	}
}

func PatchInputSchema(patches ...schema.Patch) FunctionOption {
	return func(def *functionDefinition) error {
		patched, err := schema.Apply(def.schema.InputSchema, patches...)
		if err != nil {
			return fmt.Errorf("patch input schema for %q: %w", def.schema.Name, err)
		}
		def.schema.InputSchema = patched
		return nil
	}
}

func PatchOutputSchema(patches ...schema.Patch) FunctionOption {
	return func(def *functionDefinition) error {
		patched, err := schema.Apply(def.schema.OutputSchema, patches...)
		if err != nil {
			return fmt.Errorf("patch output schema for %q: %w", def.schema.Name, err)
		}
		def.schema.OutputSchema = patched
		return nil
	}
}

func MapErrors(mapper ErrorMapper) FunctionOption {
	return func(def *functionDefinition) error {
		def.errorMapper = mapper
		return nil
	}
}

func RawHandler(handler HandlerFunc) FunctionOption {
	return func(def *functionDefinition) error {
		def.handler = handler
		return nil
	}
}

func Handle[TIn any, TOut any](handler TypedHandlerFunc[TIn, TOut]) FunctionOption {
	return func(def *functionDefinition) error {
		def.handler = func(ctx context.Context, fnCtx Context, params json.RawMessage) (json.RawMessage, error) {
			input, err := decodeInput[TIn](params)
			if err != nil {
				return nil, err
			}

			output, err := handler(ctx, fnCtx, input)
			if err != nil {
				return nil, err
			}
			if output == nil {
				return json.RawMessage(`{}`), nil
			}

			data, err := marshalResult(output)
			if err != nil {
				return nil, err
			}
			return data, nil
		}
		return nil
	}
}

func HandleProto[TIn any, TOut any](handler TypedHandlerFunc[TIn, TOut]) FunctionOption {
	return func(def *functionDefinition) error {
		def.handler = func(ctx context.Context, fnCtx Context, params json.RawMessage) (json.RawMessage, error) {
			input, err := decodeProtoInput[TIn](params)
			if err != nil {
				return nil, err
			}

			output, err := handler(ctx, fnCtx, input)
			if err != nil {
				return nil, err
			}
			if output == nil {
				return json.RawMessage(`{}`), nil
			}

			data, err := marshalProtoResult(output)
			if err != nil {
				return nil, err
			}
			return data, nil
		}
		return nil
	}
}

func HandleInput[TIn any](handler InputHandlerFunc[TIn]) FunctionOption {
	return func(def *functionDefinition) error {
		def.schema.InputSchema = schema.For[TIn]()
		def.handler = func(ctx context.Context, fnCtx Context, params json.RawMessage) (json.RawMessage, error) {
			input, err := decodeInput[TIn](params)
			if err != nil {
				return nil, err
			}

			output, err := handler(ctx, fnCtx, input)
			if err != nil {
				return nil, err
			}
			if output == nil {
				return json.RawMessage(`{}`), nil
			}

			data, err := marshalResult(output)
			if err != nil {
				return nil, err
			}
			return data, nil
		}
		return nil
	}
}

func HandleProtoInput[TIn any](handler InputHandlerFunc[TIn]) FunctionOption {
	return func(def *functionDefinition) error {
		def.schema.InputSchema = schema.For[TIn]()
		def.handler = func(ctx context.Context, fnCtx Context, params json.RawMessage) (json.RawMessage, error) {
			input, err := decodeProtoInput[TIn](params)
			if err != nil {
				return nil, err
			}

			output, err := handler(ctx, fnCtx, input)
			if err != nil {
				return nil, err
			}
			if output == nil {
				return json.RawMessage(`{}`), nil
			}

			data, err := marshalResult(output)
			if err != nil {
				return nil, err
			}
			return data, nil
		}
		return nil
	}
}

func decodeInput[TIn any](params json.RawMessage) (*TIn, error) {
	var input TIn
	if len(params) > 0 && string(params) != "null" {
		if err := json.Unmarshal(params, &input); err != nil {
			return nil, NewError(CodeBadRequest, "invalidParams", fmt.Sprintf("failed to decode params: %v", err))
		}
	}
	if validator, ok := any(&input).(Validator); ok {
		if err := validator.Validate(); err != nil {
			return nil, NewError(CodeBadRequest, "invalidParams", err.Error())
		}
	}
	return &input, nil
}

func decodeProtoInput[TIn any](params json.RawMessage) (*TIn, error) {
	var input TIn
	message, ok := any(&input).(proto.Message)
	if !ok {
		return nil, NewError(CodeBadRequest, "invalidParams", fmt.Sprintf("proto input does not implement proto.Message: %T", &input))
	}
	if len(params) > 0 && string(params) != "null" {
		unmarshalOptions := protojson.UnmarshalOptions{DiscardUnknown: true}
		if err := unmarshalOptions.Unmarshal(params, message); err != nil {
			return nil, NewError(CodeBadRequest, "invalidParams", fmt.Sprintf("failed to decode proto params: %v", err))
		}
	}
	if validator, ok := any(&input).(Validator); ok {
		if err := validator.Validate(); err != nil {
			return nil, NewError(CodeBadRequest, "invalidParams", err.Error())
		}
	}
	return &input, nil
}
