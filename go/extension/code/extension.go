package code

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"github.com/santhosh-tekuri/jsonschema/v5"
	"io"
	"strings"
	"unicode/utf8"

	"github.com/channel-io/app-sdk/go/appsdk"
	extensionkit "github.com/channel-io/app-sdk/go/extension"
	"github.com/channel-io/app-sdk/go/extension/schemaregistry"
	sdkv1 "github.com/channel-io/app-sdk/go/internal/gen/channel/app/sdk/v1"
	"google.golang.org/protobuf/encoding/protojson"
	"google.golang.org/protobuf/proto"
)

const ExtensionName = "code"
const SystemVersion = "v1"
const FunctionSendInput = "extension.code.session.sendInput"
const FunctionGetSession = "extension.code.session.getSession"
const FunctionStopSession = "extension.code.session.stopSession"

type SendInputRequest = sdkv1.CodeSendInputInput
type GetSessionRequest = sdkv1.CodeGetSessionInput
type StopSessionRequest = sdkv1.CodeStopSessionInput
type Receipt = sdkv1.CodeSessionReceipt
type Snapshot = sdkv1.CodeSessionSnapshot
type Question = sdkv1.CodeSessionQuestion
type Result = sdkv1.CodeSessionResult
type Observation = sdkv1.CodeSessionObservation
type Artifact = sdkv1.CodeSessionArtifact
type Error = sdkv1.CodeSessionError
type ContextBlock = sdkv1.CodeContextBlock
type Event = sdkv1.CodeSessionEvent
type Message = sdkv1.CodeSessionMessage
type PublicationReceipt = sdkv1.CodePublicationReceipt

type ExtensionBuilder struct {
	base *extensionkit.Builder
	err  error
}

func Extension() *ExtensionBuilder {
	return &ExtensionBuilder{base: extensionkit.New(ExtensionName, extensionkit.SystemVersion(SystemVersion))}
}
func (b *ExtensionBuilder) Register(app *appsdk.App) error {
	if b.err != nil {
		return b.err
	}
	return b.base.Register(app)
}
func (b *ExtensionBuilder) add(name string, option appsdk.FunctionOption, err error) {
	if err != nil {
		if b.err == nil {
			b.err = err
		}
		return
	}
	b.base.Func(name, schemaregistry.Append(name, option)...)
}
func (b *ExtensionBuilder) SendInput(handler appsdk.TypedHandlerFunc[SendInputRequest, Receipt]) *ExtensionBuilder {
	option, err := handleCode(FunctionSendInput, handler)
	b.add(FunctionSendInput, option, err)
	return b
}
func (b *ExtensionBuilder) GetSession(handler appsdk.TypedHandlerFunc[GetSessionRequest, Snapshot]) *ExtensionBuilder {
	option, err := handleCode(FunctionGetSession, handler)
	b.add(FunctionGetSession, option, err)
	return b
}

// StopSession is optional. Only register it when the adapter supports confirmed stopping.
func (b *ExtensionBuilder) StopSession(handler appsdk.TypedHandlerFunc[StopSessionRequest, Receipt]) *ExtensionBuilder {
	option, err := handleCode(FunctionStopSession, handler)
	b.add(FunctionStopSession, option, err)
	return b
}

// codeResult retains required nulls, zero counts and empty arrays in snapshots.
type codeResult struct{ response proto.Message }

func (r *codeResult) MarshalSDKResult() (json.RawMessage, error) {
	return protojson.MarshalOptions{EmitUnpopulated: true}.Marshal(r.response)
}
func compileSchema(value map[string]any) (*jsonschema.Schema, error) {
	data, err := json.Marshal(value)
	if err != nil {
		return nil, err
	}
	compiler := jsonschema.NewCompiler()
	compiler.AssertFormat = true
	compiler.LoadURL = func(url string) (io.ReadCloser, error) {
		return nil, fmt.Errorf("external schema references are not allowed: %s", url)
	}
	const location = "https://code.invalid/schema.json"
	if err := compiler.AddResource(location, bytes.NewReader(data)); err != nil {
		return nil, err
	}
	return compiler.Compile(location)
}
func validateJSON(schema *jsonschema.Schema, data []byte, maximum int) error {
	if len(data) > maximum || !utf8.Valid(data) {
		return fmt.Errorf("invalid UTF-8 or JSON byte limit exceeded")
	}
	var value any
	if err := json.Unmarshal(data, &value); err != nil {
		return err
	}
	return schema.Validate(value)
}
func handleCode[In, Out any](method string, handler appsdk.TypedHandlerFunc[In, Out]) (appsdk.FunctionOption, error) {
	if handler == nil {
		return nil, fmt.Errorf("code session handler is required")
	}
	definition, ok := schemaregistry.Schema(method)
	if !ok {
		return nil, fmt.Errorf("code schema not found: %s", method)
	}
	inputSchema, err := compileSchema(definition.InputSchema)
	if err != nil {
		return nil, err
	}
	outputSchema, err := compileSchema(definition.OutputSchema)
	if err != nil {
		return nil, err
	}
	return appsdk.RawHandler(func(ctx context.Context, fnCtx appsdk.Context, params json.RawMessage) (json.RawMessage, error) {
		// Validate raw params before Proto removes unknown fields or normalizes values.
		if err := validateJSON(inputSchema, params, 256*1024); err != nil {
			return nil, appsdk.NewError(appsdk.CodeBadRequest, "invalidInput", "Invalid Code Extension input")
		}
		if method != FunctionGetSession && (fnCtx.Invocation == nil || len([]rune(fnCtx.Invocation.IdempotencyKey)) > 200 || strings.Trim(fnCtx.Invocation.IdempotencyKey, "\t\n\v\f\r \u0085\u00a0\u1680\u2000\u2001\u2002\u2003\u2004\u2005\u2006\u2007\u2008\u2009\u200a\u2028\u2029\u202f\u205f\u3000\ufeff") == "") {
			return nil, appsdk.NewError(appsdk.CodeBadRequest, "invalidInput", "Trusted invocation identity is required")
		}
		input := new(In)
		message := any(input).(proto.Message)
		if err := (protojson.UnmarshalOptions{DiscardUnknown: true}).Unmarshal(params, message); err != nil {
			return nil, appsdk.NewError(appsdk.CodeBadRequest, "invalidInput", "Invalid Code Extension input")
		}
		output, err := handler(ctx, fnCtx, input)
		if err != nil {
			return nil, err
		}
		if output == nil {
			return nil, fmt.Errorf("code session handler returned no response")
		}
		data, err := (&codeResult{response: any(output).(proto.Message)}).MarshalSDKResult()
		if err != nil {
			return nil, err
		}
		if err := validateJSON(outputSchema, data, 64*1024); err != nil {
			return nil, fmt.Errorf("invalid code session output: %w", err)
		}
		var result struct {
			SessionKey string `json:"sessionKey"`
		}
		if err := json.Unmarshal(data, &result); err != nil {
			return nil, err
		}
		field := message.ProtoReflect().Descriptor().Fields().ByName("session_key")
		if result.SessionKey != message.ProtoReflect().Get(field).String() {
			return nil, fmt.Errorf("session output identity mismatch")
		}
		return data, nil
	}), nil
}
