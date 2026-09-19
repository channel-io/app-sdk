package native

import sdkv1 "github.com/channel-io/app-sdk/go/internal/gen/channel/app/sdk/v1"

// OAuth flow operations require the initiating manager's authenticated WAM
// session. An app or channel token cannot grant that authority.
const (
	FunctionGetOAuthFlow    = "getOAuthFlow"
	FunctionResumeOAuthFlow = "resumeOAuthFlow"
	FunctionCancelOAuthFlow = "cancelOAuthFlow"
)

// OAuthFlow is manager-visible onboarding state, never a provider credential.
type OAuthFlowStep = sdkv1.OAuthFlowStep

type OAuthFlow struct {
	Steps            []*OAuthFlowStep `json:"steps,omitempty"`
	ID               string           `json:"id"`
	Phase            string           `json:"phase"`
	ExpiresAt        string           `json:"expiresAt"`
	Key              *string          `json:"key,omitempty"`
	TargetAuthScope  *string          `json:"targetAuthScope,omitempty"`
	AuthorizationURL *string          `json:"authorizationURL,omitempty"`
	CanResume        *bool            `json:"canResume,omitempty"`
}

type GetOAuthFlowParams struct {
	Language *string `json:"language,omitempty"`
	FlowID   string  `json:"flowId"`
}

type ResumeOAuthFlowParams struct {
	Language    *string `json:"language,omitempty"`
	FlowID      string  `json:"flowId"`
	ResumeNonce *string `json:"resumeNonce,omitempty"`
}

type CancelOAuthFlowParams struct {
	Language *string `json:"language,omitempty"`
	FlowID   string  `json:"flowId"`
}

type OAuthFlowResult struct {
	Flow *OAuthFlow `json:"flow,omitempty"`
}
