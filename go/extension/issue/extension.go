package issue

import (
	"context"
	"encoding/json"
	"regexp"
	"strings"

	"github.com/channel-io/app-sdk/go/appsdk"
	extensionkit "github.com/channel-io/app-sdk/go/extension"
	"github.com/channel-io/app-sdk/go/extension/schemaregistry"
	sdkv1 "github.com/channel-io/app-sdk/go/internal/gen/channel/app/sdk/v1"
	"google.golang.org/protobuf/encoding/protojson"
	"google.golang.org/protobuf/proto"
)

const ExtensionName = "issue"
const SystemVersion = "v1"

type ExtensionBuilder struct{ base *extensionkit.Builder }

func Extension() *ExtensionBuilder {
	return &ExtensionBuilder{base: extensionkit.New(ExtensionName, extensionkit.SystemVersion(SystemVersion))}
}
func (b *ExtensionBuilder) Register(app *appsdk.App) error { return b.base.Register(app) }

const FunctionSearchIssues = "extension.issue.core.searchIssues"

type SearchIssuesRequest = sdkv1.IssueSearchIssuesInput
type SearchIssuesResponse = sdkv1.IssueSearchIssuesOutput

func (b *ExtensionBuilder) SearchIssues(handler appsdk.TypedHandlerFunc[SearchIssuesRequest, SearchIssuesResponse]) *ExtensionBuilder {
	b.base.Func(FunctionSearchIssues, schemaregistry.Append(FunctionSearchIssues, handleIssue(handler))...)
	return b
}

const FunctionGetIssue = "extension.issue.core.getIssue"

type GetIssueRequest = sdkv1.IssueGetIssueInput
type GetIssueResponse = sdkv1.IssueGetIssueOutput

func (b *ExtensionBuilder) GetIssue(handler appsdk.TypedHandlerFunc[GetIssueRequest, GetIssueResponse]) *ExtensionBuilder {
	b.base.Func(FunctionGetIssue, schemaregistry.Append(FunctionGetIssue, handleIssue(handler))...)
	return b
}

const FunctionGetIssues = "extension.issue.core.getIssues"

type GetIssuesRequest = sdkv1.IssueGetIssuesInput
type GetIssuesResponse = sdkv1.IssueGetIssuesOutput

func (b *ExtensionBuilder) GetIssues(handler appsdk.TypedHandlerFunc[GetIssuesRequest, GetIssuesResponse]) *ExtensionBuilder {
	b.base.Func(FunctionGetIssues, schemaregistry.Append(FunctionGetIssues, handleIssue(handler))...)
	return b
}

const FunctionGetIssueTransitions = "extension.issue.core.getIssueTransitions"

type GetIssueTransitionsRequest = sdkv1.IssueGetIssueTransitionsInput
type GetIssueTransitionsResponse = sdkv1.IssueGetIssueTransitionsOutput

func (b *ExtensionBuilder) GetIssueTransitions(handler appsdk.TypedHandlerFunc[GetIssueTransitionsRequest, GetIssueTransitionsResponse]) *ExtensionBuilder {
	b.base.Func(FunctionGetIssueTransitions, schemaregistry.Append(FunctionGetIssueTransitions, handleIssue(handler))...)
	return b
}

const FunctionExecuteIssueTransition = "extension.issue.core.executeIssueTransition"

type ExecuteIssueTransitionRequest = sdkv1.IssueExecuteIssueTransitionInput
type ExecuteIssueTransitionResponse = sdkv1.IssueExecuteIssueTransitionOutput

func (b *ExtensionBuilder) ExecuteIssueTransition(handler appsdk.TypedHandlerFunc[ExecuteIssueTransitionRequest, ExecuteIssueTransitionResponse]) *ExtensionBuilder {
	b.base.Func(FunctionExecuteIssueTransition, schemaregistry.Append(FunctionExecuteIssueTransition, handleIssue(handler))...)
	return b
}

type ExternalIssue = sdkv1.ExternalIssue
type ProviderState = sdkv1.IssueProviderState
type Transition = sdkv1.IssueTransition
type Error = sdkv1.IssueError

type GetIssuesResult = sdkv1.IssueGetIssuesResult
type TransitionInput = sdkv1.IssueTransitionInput
type TransitionField = sdkv1.IssueTransitionField
type Container = sdkv1.IssueContainer
type Actor = sdkv1.IssueActor

// issueResult preserves required zero values without emitting absent optional fields.
type issueResult struct{ response proto.Message }

func (r *issueResult) MarshalSDKResult() (json.RawMessage, error) {
	data, err := protojson.Marshal(r.response)
	if err != nil {
		return nil, err
	}
	var value map[string]any
	if err := json.Unmarshal(data, &value); err != nil {
		return nil, err
	}
	switch r.response.(type) {
	case *SearchIssuesResponse:
		if _, ok := value["issues"]; !ok {
			value["issues"] = []any{}
		}
	case *GetIssueTransitionsResponse:
		if _, ok := value["transitions"]; !ok {
			value["transitions"] = []any{}
		}
		for _, entry := range value["transitions"].([]any) {
			transition := entry.(map[string]any)
			if input, ok := transition["inputSchema"].(map[string]any); ok {
				if _, ok := input["properties"]; !ok {
					input["properties"] = map[string]any{}
				}
				if _, ok := input["additionalProperties"]; !ok {
					input["additionalProperties"] = false
				}
			}
		}
	}
	return json.Marshal(value)
}

// handleIssue applies Issue-specific required-field serialization to Proto handlers.
func handleIssue[In, Out any](handler appsdk.TypedHandlerFunc[In, Out]) appsdk.FunctionOption {
	return appsdk.HandleProto(func(ctx context.Context, fnCtx appsdk.Context, input *In) (*issueResult, error) {
		response, err := handler(ctx, fnCtx, input)
		if err != nil || response == nil {
			return nil, err
		}
		return &issueResult{response: any(response).(proto.Message)}, nil
	})
}

// StartSubscription enables delivery for one issue and returns the persisted baseline.
const FunctionStartSubscription = "extension.issue.subscription.start"

type StartSubscriptionRequest = sdkv1.IssueSubscriptionStartInput
type StartSubscriptionResponse = sdkv1.IssueSubscriptionStartOutput

func (b *ExtensionBuilder) StartSubscription(handler appsdk.TypedHandlerFunc[StartSubscriptionRequest, StartSubscriptionResponse]) *ExtensionBuilder {
	b.base.Func(FunctionStartSubscription, schemaregistry.Append(FunctionStartSubscription, handleSubscription(handler, true))...)
	return b
}

// StopSubscription ends only the logical subscription, not the provider webhook.
const FunctionStopSubscription = "extension.issue.subscription.stop"

type StopSubscriptionRequest = sdkv1.IssueSubscriptionStopInput
type StopSubscriptionResponse = sdkv1.IssueSubscriptionStopOutput

func (b *ExtensionBuilder) StopSubscription(handler appsdk.TypedHandlerFunc[StopSubscriptionRequest, StopSubscriptionResponse]) *ExtensionBuilder {
	b.base.Func(FunctionStopSubscription, schemaregistry.Append(FunctionStopSubscription, handleSubscription(handler, false))...)
	return b
}

var subscriptionIDPattern = regexp.MustCompile(`^[A-Za-z0-9_-]{1,128}$`)

// handleSubscription validates the mutation identity before application code runs.
// The registry describes discovery schemas; HandleProto alone only decodes them.
func handleSubscription[In, Out any](handler appsdk.TypedHandlerFunc[In, Out], start bool) appsdk.FunctionOption {
	return appsdk.RawHandler(func(ctx context.Context, fnCtx appsdk.Context, params json.RawMessage) (json.RawMessage, error) {
		invalid := func() (json.RawMessage, error) {
			return nil, appsdk.NewError(appsdk.CodeBadRequest, "invalidInput", "Invalid Issue function input", map[string]string{"type": "invalidInput", "message": "Invalid Issue function input"})
		}
		var fields map[string]json.RawMessage
		if err := json.Unmarshal(params, &fields); err != nil || fields == nil {
			return invalid()
		}
		var subscriptionID string
		if err := json.Unmarshal(fields["subscriptionId"], &subscriptionID); err != nil || !subscriptionIDPattern.MatchString(subscriptionID) {
			return invalid()
		}
		known := map[string]string{"subscriptionId": subscriptionID}
		if start {
			var issueID string
			if err := json.Unmarshal(fields["issueId"], &issueID); err != nil || !hasIssueText(issueID) {
				return invalid()
			}
			known["issueId"] = issueID
		}
		// Select camelCase fields before protobuf decoding, matching the TS schema's
		// unknown-field stripping (including protobuf's snake_case aliases).
		data, err := json.Marshal(known)
		if err != nil {
			return nil, err
		}
		var input In
		if err := protojson.Unmarshal(data, any(&input).(proto.Message)); err != nil {
			return invalid()
		}
		output, err := handler(ctx, fnCtx, &input)
		if err != nil || output == nil {
			if err == nil {
				return json.RawMessage(`{}`), nil
			}
			return nil, err
		}
		return (&issueResult{response: any(output).(proto.Message)}).MarshalSDKResult()
	})
}

func hasIssueText(value string) bool {
	// ECMAScript whitespace, matching the canonical Issue input schema's /\S/.
	return strings.Trim(value, " \t\n\r\v\f\u00a0\u1680\u2000\u2001\u2002\u2003\u2004\u2005\u2006\u2007\u2008\u2009\u200a\u2028\u2029\u202f\u205f\u3000\ufeff") != ""
}
