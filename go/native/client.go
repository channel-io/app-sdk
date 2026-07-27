package native

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"strings"
	"time"

	"github.com/channel-io/app-sdk/go/appsdk"
)

const DefaultAppStoreURL = "https://app-store.channel.io"

const (
	FunctionCreateAppDataTable       = "createAppDataTable"
	FunctionCreateAppDataTableSchema = "createAppDataTableSchema"
	FunctionGetAppDataTableSchema    = "getAppDataTableSchema"
	FunctionUpsertAppDataTableRows   = "upsertAppDataTableRows"
	FunctionRegisterAppNotebooks     = "registerAppNotebooks"
	FunctionGetAppNotebookVersions   = "getAppNotebookVersions"
)

type Client struct {
	baseURL    string
	httpClient *http.Client
}

type Option func(*Client)

func WithBaseURL(baseURL string) Option {
	return func(c *Client) {
		c.baseURL = strings.TrimRight(baseURL, "/")
	}
}

func WithHTTPClient(httpClient *http.Client) Option {
	return func(c *Client) {
		c.httpClient = httpClient
	}
}

func NewClient(opts ...Option) *Client {
	c := &Client{
		baseURL: DefaultAppStoreURL,
		httpClient: &http.Client{
			Timeout: 15 * time.Second,
		},
	}
	for _, opt := range opts {
		opt(c)
	}
	return c
}

type functionRequest struct {
	Method        string          `json:"method"`
	Params        any             `json:"params,omitempty"`
	Context       *appsdk.Context `json:"context,omitempty"`
	SystemVersion string          `json:"systemVersion,omitempty"`
}

type functionResponse struct {
	Result json.RawMessage               `json:"result,omitempty"`
	Error  *appsdk.FunctionErrorResponse `json:"error,omitempty"`
}

type IssueTokenOptions struct {
	ChannelID string
}

type IssueTokenResponse struct {
	AccessToken  string `json:"accessToken"`
	RefreshToken string `json:"refreshToken"`
	ExpiresIn    int    `json:"expiresIn"`
}

type RegisterExtensionResponse struct {
	Success          bool     `json:"success"`
	ErrorMessage     string   `json:"errorMessage,omitempty"`
	ValidationErrors []string `json:"validationErrors,omitempty"`
}

type RegisterAlfTasksResponse struct {
	Success      bool   `json:"success"`
	ErrorMessage string `json:"errorMessage,omitempty"`
	TotalTasks   int    `json:"totalTasks"`
	CreatedCount int    `json:"createdCount"`
	UpdatedCount int    `json:"updatedCount"`
	DeletedCount int    `json:"deletedCount"`
}

type AlfTaskVersion struct {
	ID      string `json:"id"`
	Name    string `json:"name"`
	Version string `json:"version"`
}

type GetAlfTaskVersionsResponse struct {
	Success      bool             `json:"success"`
	ErrorMessage string           `json:"errorMessage,omitempty"`
	Tasks        []AlfTaskVersion `json:"tasks"`
}

type RegisterAppNotebooksResponse struct {
	Success        bool   `json:"success"`
	ErrorMessage   string `json:"errorMessage,omitempty"`
	SyncRunID      string `json:"syncRunId,omitempty"`
	Status         string `json:"status,omitempty"`
	TotalNotebooks int    `json:"totalNotebooks"`
	CreatedCount   int    `json:"createdCount"`
	UpdatedCount   int    `json:"updatedCount"`
	DeletedCount   int    `json:"deletedCount"`
}

type AppNotebookVersion struct {
	NotebookKey      string `json:"notebookKey"`
	Version          int    `json:"version"`
	LatestRevisionID string `json:"latestRevisionId,omitempty"`
	UpdatedAt        string `json:"updatedAt,omitempty"`
}

type GetAppNotebookVersionsResponse struct {
	Success      bool                 `json:"success"`
	ErrorMessage string               `json:"errorMessage,omitempty"`
	Notebooks    []AppNotebookVersion `json:"notebooks"`
}

type AppDataTableColumn struct {
	Key         string `json:"key"`
	Name        string `json:"name"`
	Type        string `json:"type"`
	Nullable    bool   `json:"nullable,omitempty"`
	Description string `json:"description,omitempty"`
}

type AppDataTableSchema struct {
	ChannelID         string               `json:"channelId,omitempty"`
	AppID             string               `json:"appId,omitempty"`
	TableName         string               `json:"tableName"`
	Columns           []AppDataTableColumn `json:"columns"`
	PrimaryKeyColumns []string             `json:"primaryKeyColumns,omitempty"`
}

type CreateAppDataTableParams struct {
	AppID             string               `json:"appId"`
	TableName         string               `json:"tableName"`
	Columns           []AppDataTableColumn `json:"columns"`
	PrimaryKeyColumns []string             `json:"primaryKeyColumns,omitempty"`
}

type CreateAppDataTableResponse struct {
	RequestID string `json:"requestId"`
}

type CreateAppDataTableSchemaParams struct {
	ChannelID         string               `json:"channelId"`
	AppID             string               `json:"appId"`
	TableName         string               `json:"tableName"`
	Columns           []AppDataTableColumn `json:"columns"`
	PrimaryKeyColumns []string             `json:"primaryKeyColumns,omitempty"`
}

type CreateAppDataTableSchemaResponse struct {
	RequestID string              `json:"requestId"`
	Schema    *AppDataTableSchema `json:"schema,omitempty"`
}

type GetAppDataTableSchemaParams struct {
	ChannelID string `json:"channelId"`
	AppID     string `json:"appId"`
	TableName string `json:"tableName"`
}

type GetAppDataTableSchemaResponse struct {
	Schema *AppDataTableSchema `json:"schema,omitempty"`
}

type UpsertAppDataTableRowsParams struct {
	ChannelID string           `json:"channelId"`
	AppID     string           `json:"appId"`
	TableName string           `json:"tableName"`
	Rows      []map[string]any `json:"rows"`
}

type UpsertAppDataTableRowsResponse struct {
	RequestID        string `json:"requestId"`
	AcceptedRowCount int    `json:"acceptedRowCount"`
}

func (c *Client) IssueToken(ctx context.Context, secret string, opts ...IssueTokenOptions) (*IssueTokenResponse, error) {
	params := map[string]any{"secret": secret}
	if len(opts) > 0 && opts[0].ChannelID != "" {
		params["channelId"] = opts[0].ChannelID
	}
	return callNative[IssueTokenResponse](ctx, c, "", "issueToken", params)
}

func (c *Client) RefreshToken(ctx context.Context, refreshToken string) (*IssueTokenResponse, error) {
	return callNative[IssueTokenResponse](ctx, c, "", "refreshToken", map[string]any{"refreshToken": refreshToken})
}

func (c *Client) RegisterExtension(ctx context.Context, accessToken, appID, extensionName, systemVersion string) (*RegisterExtensionResponse, error) {
	return callNative[RegisterExtensionResponse](ctx, c, accessToken, "registerExtension", map[string]any{
		"appId":         appID,
		"extensionName": extensionName,
		"systemVersion": systemVersion,
	})
}

func (c *Client) UnregisterExtension(ctx context.Context, accessToken, appID, extensionName, systemVersion string) (*RegisterExtensionResponse, error) {
	return callNative[RegisterExtensionResponse](ctx, c, accessToken, "unregisterExtension", map[string]any{
		"appId":         appID,
		"extensionName": extensionName,
		"systemVersion": systemVersion,
	})
}

func (c *Client) RegisterAlfTasks(ctx context.Context, accessToken, appID string) (*RegisterAlfTasksResponse, error) {
	return callNative[RegisterAlfTasksResponse](ctx, c, accessToken, "registerAlfTasks", map[string]any{"appId": appID})
}

func (c *Client) GetAlfTaskVersions(ctx context.Context, accessToken, appID string) (*GetAlfTaskVersionsResponse, error) {
	return callNative[GetAlfTaskVersionsResponse](ctx, c, accessToken, "getAlfTaskVersions", map[string]any{"appId": appID})
}

func (c *Client) RegisterAppNotebooks(ctx context.Context, accessToken, appID string) (*RegisterAppNotebooksResponse, error) {
	return callNative[RegisterAppNotebooksResponse](ctx, c, accessToken, FunctionRegisterAppNotebooks, map[string]any{"appId": appID})
}

func (c *Client) GetAppNotebookVersions(ctx context.Context, accessToken, appID string) (*GetAppNotebookVersionsResponse, error) {
	return callNative[GetAppNotebookVersionsResponse](ctx, c, accessToken, FunctionGetAppNotebookVersions, map[string]any{"appId": appID})
}

func (c *Client) CreateAppDataTable(ctx context.Context, accessToken string, params CreateAppDataTableParams) (*CreateAppDataTableResponse, error) {
	return callNative[CreateAppDataTableResponse](ctx, c, accessToken, FunctionCreateAppDataTable, params)
}

func (c *Client) CreateAppDataTableSchema(ctx context.Context, accessToken string, params CreateAppDataTableSchemaParams) (*CreateAppDataTableSchemaResponse, error) {
	return callNative[CreateAppDataTableSchemaResponse](ctx, c, accessToken, FunctionCreateAppDataTableSchema, params)
}

func (c *Client) GetAppDataTableSchema(ctx context.Context, accessToken string, params GetAppDataTableSchemaParams) (*GetAppDataTableSchemaResponse, error) {
	return callNative[GetAppDataTableSchemaResponse](ctx, c, accessToken, FunctionGetAppDataTableSchema, params)
}

func (c *Client) UpsertAppDataTableRows(ctx context.Context, accessToken string, params UpsertAppDataTableRowsParams) (*UpsertAppDataTableRowsResponse, error) {
	return callNative[UpsertAppDataTableRowsResponse](ctx, c, accessToken, FunctionUpsertAppDataTableRows, params)
}

func (c *Client) CallAppFunction(ctx context.Context, accessToken, appID, method string, params any, fnCtx appsdk.Context, systemVersion string) (json.RawMessage, error) {
	req := functionRequest{Method: method, Params: params, Context: &fnCtx, SystemVersion: systemVersion}
	return c.call(ctx, fmt.Sprintf("/general/v1/apps/%s/functions", appID), accessToken, req)
}

// CallNativeFunction invokes a public AppStore Native Function and returns its raw JSON result.
// Use a channel-scoped token for Channel operations and an app token for app-owned operations.
func (c *Client) CallNativeFunction(ctx context.Context, accessToken, method string, params any) (json.RawMessage, error) {
	return c.call(ctx, "/general/v1/native/functions", accessToken, functionRequest{Method: method, Params: params})
}

// CallNative invokes a public AppStore Native Function and decodes its result into T.
// Prefer a typed Client or ProxyAPI method when one is available.
func CallNative[T any](ctx context.Context, c *Client, accessToken, method string, params any) (*T, error) {
	data, err := c.CallNativeFunction(ctx, accessToken, method, params)
	if err != nil {
		return nil, err
	}
	var result T
	if err := json.Unmarshal(data, &result); err != nil {
		return nil, err
	}
	return &result, nil
}

func callNative[T any](ctx context.Context, c *Client, accessToken, method string, params any) (*T, error) {
	return CallNative[T](ctx, c, accessToken, method, params)
}

func (c *Client) call(ctx context.Context, path, accessToken string, payload any) (json.RawMessage, error) {
	body, err := json.Marshal(payload)
	if err != nil {
		return nil, err
	}

	req, err := http.NewRequestWithContext(ctx, http.MethodPut, c.baseURL+path, bytes.NewReader(body))
	if err != nil {
		return nil, err
	}
	req.Header.Set("Content-Type", "application/json")
	if accessToken != "" {
		req.Header.Set("x-access-token", accessToken)
	}

	resp, err := c.httpClient.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	var decoded functionResponse
	if err := json.NewDecoder(resp.Body).Decode(&decoded); err != nil {
		return nil, err
	}
	if decoded.Error != nil {
		return nil, fmt.Errorf("native function error: %s", decoded.Error.Message)
	}
	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		return nil, fmt.Errorf("native function failed: status=%d", resp.StatusCode)
	}
	return decoded.Result, nil
}
