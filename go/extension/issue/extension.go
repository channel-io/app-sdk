package issue

import (
	"github.com/channel-io/app-sdk/go/appsdk"
	extensionkit "github.com/channel-io/app-sdk/go/extension"
	"github.com/channel-io/app-sdk/go/extension/schemaregistry"
	sdkv1 "github.com/channel-io/app-sdk/go/internal/gen/channel/app/sdk/v1"
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
	b.base.Func(FunctionSearchIssues, schemaregistry.Append(FunctionSearchIssues, appsdk.HandleProto(handler))...)
	return b
}

const FunctionGetIssue = "extension.issue.core.getIssue"

type GetIssueRequest = sdkv1.IssueGetIssueInput
type GetIssueResponse = sdkv1.IssueGetIssueOutput

func (b *ExtensionBuilder) GetIssue(handler appsdk.TypedHandlerFunc[GetIssueRequest, GetIssueResponse]) *ExtensionBuilder {
	b.base.Func(FunctionGetIssue, schemaregistry.Append(FunctionGetIssue, appsdk.HandleProto(handler))...)
	return b
}

const FunctionGetIssues = "extension.issue.core.getIssues"

type GetIssuesRequest = sdkv1.IssueGetIssuesInput
type GetIssuesResponse = sdkv1.IssueGetIssuesOutput

func (b *ExtensionBuilder) GetIssues(handler appsdk.TypedHandlerFunc[GetIssuesRequest, GetIssuesResponse]) *ExtensionBuilder {
	b.base.Func(FunctionGetIssues, schemaregistry.Append(FunctionGetIssues, appsdk.HandleProto(handler))...)
	return b
}

const FunctionGetIssueTransitions = "extension.issue.core.getIssueTransitions"

type GetIssueTransitionsRequest = sdkv1.IssueGetIssueTransitionsInput
type GetIssueTransitionsResponse = sdkv1.IssueGetIssueTransitionsOutput

func (b *ExtensionBuilder) GetIssueTransitions(handler appsdk.TypedHandlerFunc[GetIssueTransitionsRequest, GetIssueTransitionsResponse]) *ExtensionBuilder {
	b.base.Func(FunctionGetIssueTransitions, schemaregistry.Append(FunctionGetIssueTransitions, appsdk.HandleProto(handler))...)
	return b
}

const FunctionExecuteIssueTransition = "extension.issue.core.executeIssueTransition"

type ExecuteIssueTransitionRequest = sdkv1.IssueExecuteIssueTransitionInput
type ExecuteIssueTransitionResponse = sdkv1.IssueExecuteIssueTransitionOutput

func (b *ExtensionBuilder) ExecuteIssueTransition(handler appsdk.TypedHandlerFunc[ExecuteIssueTransitionRequest, ExecuteIssueTransitionResponse]) *ExtensionBuilder {
	b.base.Func(FunctionExecuteIssueTransition, schemaregistry.Append(FunctionExecuteIssueTransition, appsdk.HandleProto(handler))...)
	return b
}

type ExternalIssue = sdkv1.ExternalIssue
type ProviderState = sdkv1.IssueProviderState
type Transition = sdkv1.IssueTransition
type Error = sdkv1.IssueError
