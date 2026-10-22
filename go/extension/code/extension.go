package code

import (
	"context"
	"encoding/json"
	"fmt"

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

type ExtensionBuilder struct{ base *extensionkit.Builder }

func Extension() *ExtensionBuilder {
	return &ExtensionBuilder{base: extensionkit.New(ExtensionName, extensionkit.SystemVersion(SystemVersion))}
}
func (b *ExtensionBuilder) Register(app *appsdk.App) error { return b.base.Register(app) }
func (b *ExtensionBuilder) SendInput(handler appsdk.TypedHandlerFunc[SendInputRequest, Receipt]) *ExtensionBuilder {
	b.base.Func(FunctionSendInput, schemaregistry.Append(FunctionSendInput, handleCode(handler))...)
	return b
}
func (b *ExtensionBuilder) GetSession(handler appsdk.TypedHandlerFunc[GetSessionRequest, Snapshot]) *ExtensionBuilder {
	b.base.Func(FunctionGetSession, schemaregistry.Append(FunctionGetSession, handleCode(handler))...)
	return b
}

// StopSession is optional. Only register it when the adapter supports confirmed stopping.
func (b *ExtensionBuilder) StopSession(handler appsdk.TypedHandlerFunc[StopSessionRequest, Receipt]) *ExtensionBuilder {
	b.base.Func(FunctionStopSession, schemaregistry.Append(FunctionStopSession, handleCode(handler))...)
	return b
}

// codeResult retains required nulls, zero counts and empty arrays in snapshots.
type codeResult struct{ response proto.Message }

func (r *codeResult) MarshalSDKResult() (json.RawMessage, error) {
	return protojson.MarshalOptions{EmitUnpopulated: true}.Marshal(r.response)
}
func handleCode[In, Out any](handler appsdk.TypedHandlerFunc[In, Out]) appsdk.FunctionOption {
	return appsdk.HandleProto(func(ctx context.Context, fnCtx appsdk.Context, input *In) (*codeResult, error) {
		output, err := handler(ctx, fnCtx, input)
		if err != nil {
			return nil, err
		}
		if output == nil {
			return nil, fmt.Errorf("code session handler returned no response")
		}
		return &codeResult{response: any(output).(proto.Message)}, nil
	})
}
