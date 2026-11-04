package issue

import (
	"context"
	"encoding/json"
	"regexp"

	"github.com/channel-io/app-sdk/go/appsdk"
	"github.com/channel-io/app-sdk/go/extension/schemaregistry"
	sdkv1 "github.com/channel-io/app-sdk/go/internal/gen/channel/app/sdk/v1"
	"google.golang.org/protobuf/encoding/protojson"
	"google.golang.org/protobuf/proto"
)

const FunctionGetCreateSchema = "extension.issue.core.getCreateSchema"
const FunctionCreateIssue = "extension.issue.core.createIssue"

type GetCreateSchemaRequest = sdkv1.IssueGetCreateSchemaInput
type GetCreateSchemaResponse = sdkv1.IssueGetCreateSchemaOutput
type CreateIssueRequest = sdkv1.IssueCreateIssueInput
type CreateIssueResponse = sdkv1.IssueCreateIssueOutput
type CreateChoice = sdkv1.IssueCreateChoice
type CreateFieldValue = sdkv1.IssueCreateFieldValue
type CreateFormField = sdkv1.IssueCreateFormField
type CreateValues = sdkv1.IssueCreateValues
type CreateSelectedValues = sdkv1.IssueCreateSelectedValues
type CreateSchemaPage = sdkv1.IssueCreateSchemaPage
type FieldError = sdkv1.IssueFieldError
type Recovery = sdkv1.IssueRecovery

func (b *ExtensionBuilder) GetCreateSchema(handler appsdk.TypedHandlerFunc[GetCreateSchemaRequest, GetCreateSchemaResponse]) *ExtensionBuilder {
	b.base.Func(FunctionGetCreateSchema, schemaregistry.Append(FunctionGetCreateSchema, handleCreate(handler, false))...)
	return b
}
func (b *ExtensionBuilder) CreateIssue(handler appsdk.TypedHandlerFunc[CreateIssueRequest, CreateIssueResponse]) *ExtensionBuilder {
	b.base.Func(FunctionCreateIssue, schemaregistry.Append(FunctionCreateIssue, handleCreate(handler, true))...)
	return b
}

var createRequestID = regexp.MustCompile(`^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$`)

func handleCreate[In, Out any](handler appsdk.TypedHandlerFunc[In, Out], create bool) appsdk.FunctionOption {
	return appsdk.RawHandler(func(ctx context.Context, fnCtx appsdk.Context, params json.RawMessage) (json.RawMessage, error) {
		invalid := func() (json.RawMessage, error) {
			return nil, appsdk.NewError(appsdk.CodeBadRequest, "invalidInput", "Invalid Issue function input", map[string]string{"type": "invalidInput", "message": "Invalid Issue function input"})
		}
		var input map[string]any
		if json.Unmarshal(params, &input) != nil || input == nil {
			return invalid()
		}
		known := map[string]any{}
		keys := []string{"selected", "page"}
		if create {
			keys = []string{"containerId", "title", "description", "templateId", "fields", "requestId", "accountRef", "recoveryOnly"}
		}
		for _, key := range keys {
			if value, ok := input[key]; ok {
				known[key] = value
			}
		}
		if create {
			id, ok := known["requestId"].(string)
			if !ok || !createRequestID.MatchString(id) {
				return invalid()
			}
			account, ok := known["accountRef"].(string)
			if !ok || !hasIssueText(account) {
				return invalid()
			}
			if value, ok := known["recoveryOnly"]; ok {
				if _, ok := value.(bool); !ok {
					return invalid()
				}
			}
			if !validCreateValues(known, true) {
				return invalid()
			}
		} else {
			if value, ok := known["selected"]; ok {
				selected, ok := value.(map[string]any)
				if !ok || !validCreateValues(selected, false) {
					return invalid()
				}
			}
			if value, ok := known["page"]; ok {
				page, ok := value.(map[string]any)
				if !ok || len(page) != 2 {
					return invalid()
				}
				key, k := page["key"].(string)
				since, s := page["since"].(string)
				if !k || !s || !hasIssueText(key) || !hasIssueText(since) {
					return invalid()
				}
			}
		}
		data, err := json.Marshal(known)
		if err != nil {
			return invalid()
		}
		var in In
		if protojson.Unmarshal(data, any(&in).(proto.Message)) != nil {
			return invalid()
		}
		output, err := handler(ctx, fnCtx, &in)
		if err != nil {
			return nil, err
		}
		if output == nil {
			return json.RawMessage(`{}`), nil
		}
		return (&issueResult{response: any(output).(proto.Message)}).MarshalSDKResult()
	})
}

func validCreateValues(values map[string]any, create bool) bool {
	for key, value := range values {
		switch key {
		case "containerId":
			s, ok := value.(string)
			if !ok || !hasIssueText(s) {
				return false
			}
		case "templateId":
			s, ok := value.(string)
			if !ok || s == "" {
				return false
			}
		case "title", "description":
			if _, ok := value.(string); !ok {
				return false
			}
		case "fields":
			fields, ok := value.([]any)
			if !ok {
				return false
			}
			seen := map[string]bool{}
			for _, entry := range fields {
				field, ok := entry.(map[string]any)
				if !ok || len(field) != 2 {
					return false
				}
				key, ok := field["key"].(string)
				if !ok || key == "" || seen[key] || key == "containerId" || key == "title" || key == "description" || key == "templateId" {
					return false
				}
				seen[key] = true
				if !validCreateValue(field["value"]) {
					return false
				}
			}
		case "requestId", "accountRef", "recoveryOnly":
			if !create {
				return false
			}
		default:
			return false
		}
	}
	if create {
		_, ok := values["containerId"]
		return ok
	}
	return true
}
func validCreateValue(value any) bool {
	switch v := value.(type) {
	case string, float64, bool:
		return true
	case []any:
		kind := ""
		seen := map[any]bool{}
		for _, item := range v {
			current := ""
			switch item.(type) {
			case string:
				current = "string"
			case float64:
				current = "number"
			default:
				return false
			}
			if kind != "" && kind != current {
				return false
			}
			if seen[item] {
				return false
			}
			seen[item] = true
			kind = current
		}
		return true
	default:
		return false
	}
}
