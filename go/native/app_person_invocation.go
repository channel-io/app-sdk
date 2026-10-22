package native

import "context"

type ReplyToAppPersonInvocationParams struct {
	InvocationID string `json:"invocationId"`
	PlainText    string `json:"plainText"`
}
type ReplyToAppPersonInvocationResult struct {
	Status        string  `json:"status"`
	DeskMessageID *string `json:"deskMessageId,omitempty"`
	ErrorCode     *string `json:"errorCode,omitempty"`
}

// ReplyToAppPersonInvocation uses the handler's request-local delegated credential.
// The ordinary token parameter cannot replace an active invocation binding.
func (c *Client) ReplyToAppPersonInvocation(ctx context.Context, accessToken string, params ReplyToAppPersonInvocationParams) (*ReplyToAppPersonInvocationResult, error) {
	return callNative[ReplyToAppPersonInvocationResult](ctx, c, accessToken, "replyToAppPersonInvocation", params)
}
