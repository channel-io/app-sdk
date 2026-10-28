package native

import "context"

const FunctionWriteGroupMessage = "writeGroupMessage"

// ProxyAPI exposes typed Channel operations using one channel-scoped access token.
// Create it with Client.CreateProxyAPI after obtaining the token from TokenManager.
type ProxyAPI struct {
	client      *Client
	accessToken string
}

// CreateProxyAPI creates a typed Channel-operation client for a channel-scoped token.
func (c *Client) CreateProxyAPI(accessToken string) *ProxyAPI {
	return &ProxyAPI{client: c, accessToken: accessToken}
}

type WriteMessageDTO struct {
	Blocks        []map[string]any `json:"blocks,omitempty"`
	PlainText     string           `json:"plainText,omitempty"`
	Buttons       []map[string]any `json:"buttons,omitempty"`
	Files         []map[string]any `json:"files,omitempty"`
	WebPage       map[string]any   `json:"webPage,omitempty"`
	Form          map[string]any   `json:"form,omitempty"`
	Options       []string         `json:"options,omitempty"`
	RequestID     string           `json:"requestId,omitempty"`
	BotName       string           `json:"botName,omitempty"`
	ManagerID     string           `json:"managerId,omitempty"`
	UserID        string           `json:"userId,omitempty"`
	CustomPayload map[string]any   `json:"customPayload,omitempty"`
}

type WriteGroupMessageParams struct {
	ChannelID     string          `json:"channelId"`
	GroupID       string          `json:"groupId"`
	RootMessageID string          `json:"rootMessageId,omitempty"`
	Broadcast     bool            `json:"broadcast,omitempty"`
	DTO           WriteMessageDTO `json:"dto"`
}

type ProxyMessage map[string]any

type WriteGroupMessageResult struct {
	Message ProxyMessage `json:"message"`
}

// WriteGroupMessage writes a message with the installed app's bot profile.
func (p *ProxyAPI) WriteGroupMessage(ctx context.Context, params WriteGroupMessageParams) (*WriteGroupMessageResult, error) {
	return CallNative[WriteGroupMessageResult](ctx, p.client, p.accessToken, FunctionWriteGroupMessage, params)
}

const FunctionPatchMessage = "patchMessage"

// PatchMessageBody contains fields supported by the message PATCH contract.
// Include a field in UpdateMask to apply it; a zero value clears that field.
type PatchMessageBody struct {
	Options         []string `json:"options,omitempty"`
	State           string   `json:"state,omitempty"`
	MediumSyncState string   `json:"mediumSyncState,omitempty"`
	ErrorCode       int32    `json:"errorCode,omitempty"`
}

type PatchMessageParams struct {
	ChannelID string           `json:"channelId"`
	ChatID    string           `json:"chatId"`
	ChatType  string           `json:"chatType"`
	MessageID string           `json:"messageId"`
	Body      PatchMessageBody `json:"body"`
	// Protobuf JSON field mask, for example "mediumSyncState,errorCode".
	UpdateMask string `json:"updateMask"`
}

type PatchMessageResult struct {
	Message ProxyMessage `json:"message"`
}

// PatchMessage updates an existing message with the specified delivery fields.
// The channel token must have the explicitly granted patchMessage permission.
func (p *ProxyAPI) PatchMessage(ctx context.Context, params PatchMessageParams) (*PatchMessageResult, error) {
	return CallNative[PatchMessageResult](ctx, p.client, p.accessToken, FunctionPatchMessage, params)
}
