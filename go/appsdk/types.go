package appsdk

import "encoding/json"

const (
	MethodGetFunctions     = "extension.core.function.getFunctions"
	MethodGetTestFunctions = "extension.core.function.getTestFunctions"

	CoreExtensionName    = "core"
	DefaultSystemVersion = "v1"
)

type CallerType string

const (
	CallerTypeUser    CallerType = "user"
	CallerTypeManager CallerType = "manager"
	CallerTypeSystem  CallerType = "system"
	CallerTypeApp     CallerType = "app"
)

type Caller struct {
	Type CallerType `json:"type"`
	ID   string     `json:"id,omitempty"`
}

type Channel struct {
	ID string `json:"id"`
}

type Chat struct {
	Type string `json:"type"`
	ID   string `json:"id"`
}

type User struct {
	ID        string          `json:"id,omitempty"`
	ChannelID string          `json:"channelId,omitempty"`
	Type      string          `json:"type,omitempty"`
	Member    bool            `json:"member,omitempty"`
	MemberID  string          `json:"memberId,omitempty"`
	Profile   json.RawMessage `json:"profile,omitempty"`
}

type UserChat struct {
	ID      string          `json:"id,omitempty"`
	Profile json.RawMessage `json:"profile,omitempty"`
	State   string          `json:"state,omitempty"`
}

type WebhookEndpointContext struct {
	URL string `json:"url"`
}

type Context struct {
	Caller          Caller                            `json:"caller"`
	Channel         Channel                           `json:"channel"`
	User            *User                             `json:"user,omitempty"`
	UserChat        *UserChat                         `json:"userChat,omitempty"`
	AuthToken       string                            `json:"authToken,omitempty"`
	LegacyAuthToken string                            `json:"legacyAuthToken,omitempty"`
	APICredentials  map[string]string                 `json:"apiCredentials,omitempty"`
	Config          map[string]any                    `json:"config,omitempty"`
	Webhooks        map[string]WebhookEndpointContext `json:"webhooks,omitempty"`
	Language        string                            `json:"language,omitempty"`
	Sandbox         bool                              `json:"sandbox,omitempty"`
	SessionID       string                            `json:"sessionId,omitempty"`
	SeedState       any                               `json:"seedState,omitempty"`
}

func (c *Context) UnmarshalJSON(data []byte) error {
	type contextAlias Context
	raw := struct {
		*contextAlias
		LegacyAuthTokenAlias string `json:"auth_token,omitempty"`
	}{
		contextAlias: (*contextAlias)(c),
	}
	if err := json.Unmarshal(data, &raw); err != nil {
		return err
	}
	if c.LegacyAuthToken == "" {
		c.LegacyAuthToken = raw.LegacyAuthTokenAlias
	}
	return nil
}

func (c Context) GetAuthToken() string {
	if c.AuthToken != "" {
		return c.AuthToken
	}
	return c.LegacyAuthToken
}

type FunctionRequest struct {
	Method        string          `json:"method"`
	Params        json.RawMessage `json:"params,omitempty"`
	Context       Context         `json:"context"`
	SystemVersion string          `json:"systemVersion,omitempty"`
}

type FunctionResponse struct {
	Result json.RawMessage        `json:"result,omitempty"`
	Error  *FunctionErrorResponse `json:"error,omitempty"`
}

func (r FunctionResponse) IsError() bool {
	return r.Error != nil
}

type FunctionErrorResponse struct {
	Code    int             `json:"code"`
	Message string          `json:"message"`
	Data    json.RawMessage `json:"data,omitempty"`
	// Type is an optional logical error category such as "invalidParams",
	// "methodNotFound", or "internal". Keep code/message as the canonical contract.
	Type string `json:"type,omitempty"`
}

type GetFunctionsResult struct {
	Functions    []FunctionSchema `json:"functions"`
	Success      bool             `json:"success"`
	ErrorMessage string           `json:"errorMessage"`
}

type GetFunctionsResponse struct {
	Result GetFunctionsResult `json:"result"`
}

type ExtensionRegistration struct {
	Name          string `json:"name"`
	SystemVersion string `json:"systemVersion"`
}

type FunctionSchema struct {
	Name         string         `json:"name"`
	Description  string         `json:"description,omitempty"`
	InputSchema  map[string]any `json:"inputSchema"`
	OutputSchema map[string]any `json:"outputSchema,omitempty"`
}
