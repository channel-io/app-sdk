package issue

import (
	"context"
	"encoding/json"
	"errors"
	"net/url"
	"strings"
	"unicode"

	"github.com/channel-io/app-sdk/go/appsdk"
	"github.com/channel-io/app-sdk/go/extension/schemaregistry"
	sdkv1 "github.com/channel-io/app-sdk/go/internal/gen/channel/app/sdk/v1"
	"google.golang.org/protobuf/encoding/protojson"
)

const FunctionCreateComment = "extension.issue.core.createComment"

type CreateCommentRequest = sdkv1.IssueCreateCommentInput
type CreateCommentResponse = sdkv1.IssueCreateCommentOutput

func (b *ExtensionBuilder) CreateComment(handler appsdk.TypedHandlerFunc[CreateCommentRequest, CreateCommentResponse]) *ExtensionBuilder {
	b.base.Func(FunctionCreateComment, schemaregistry.Append(FunctionCreateComment, appsdk.RawHandler(func(ctx context.Context, fnCtx appsdk.Context, params json.RawMessage) (json.RawMessage, error) {
		invalid := func() (json.RawMessage, error) {
			return nil, appsdk.NewError(appsdk.CodeBadRequest, "invalidInput", "Invalid Issue function input", map[string]string{"type": "invalidInput", "message": "Invalid Issue function input"})
		}
		var input map[string]any
		if json.Unmarshal(params, &input) != nil || input == nil {
			return invalid()
		}
		var in CreateCommentRequest
		for key, target := range map[string]*string{"issueId": &in.IssueId, "body": &in.Body, "requestId": &in.RequestId, "accountRef": &in.AccountRef} {
			value, ok := input[key].(string)
			if !ok || !hasIssueText(value) {
				return invalid()
			}
			*target = value
		}
		length := 0
		for _, r := range in.Body {
			length++
			if r > 0xffff {
				length++
			}
		}
		if !createRequestID.MatchString(in.RequestId) || length > 16000 {
			return invalid()
		}
		if value, ok := input["recoveryOnly"]; ok {
			recovery, ok := value.(bool)
			if !ok {
				return invalid()
			}
			in.RecoveryOnly = &recovery
		}
		output, err := handler(ctx, fnCtx, &in)
		if err != nil {
			return nil, err
		}
		if output == nil || !hasIssueText(output.CommentId) {
			return nil, errors.New("invalid Issue createComment output")
		}
		if output.Url != nil {
			raw := *output.Url
			u, err := url.Parse(raw)
			if err != nil || !strings.EqualFold(u.Scheme, "https") || u.Hostname() == "" || strings.ContainsFunc(raw, func(r rune) bool { return r == '\\' || r == '\ufeff' || unicode.IsSpace(r) }) {
				return nil, errors.New("invalid Issue createComment output")
			}
		}
		return protojson.Marshal(output)
	}))...)
	return b
}
