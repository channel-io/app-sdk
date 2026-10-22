package appsdk

import (
	"context"
	"encoding/base64"
	"fmt"
	"regexp"
	"strings"
)

// AppPersonInvocationContext carries a private, purpose-bound callback credential.
// Never persist it in application data or include it in logs.
type AppPersonInvocationContext struct {
	InvocationID string `json:"invocationId"`
	AccessToken  string `json:"accessToken"`
}

func (AppPersonInvocationContext) String() string   { return "[REDACTED]" }
func (AppPersonInvocationContext) GoString() string { return "[REDACTED]" }

type appPersonBindingKey struct{}
type appPersonBinding struct {
	invocation AppPersonInvocationContext
	channelID  string
}

var hookTokenPattern = regexp.MustCompile(`^aph1\.[^.\s]+\.[A-Za-z0-9_-]{43}$`)

// BindAppPersonInvocation captures the signed private metadata for request-local callbacks.
// A present but incomplete marker is an error, never ordinary token authority.
func BindAppPersonInvocation(ctx context.Context, fnCtx Context) (context.Context, error) {
	if fnCtx.AppPersonInvocation == nil && !fnCtx.appPersonInvocationPresent {
		return ctx, nil
	}
	grant := fnCtx.AppPersonInvocation
	if grant == nil || !validInvocationID(grant.InvocationID) || fnCtx.Channel.ID == "" || !hookTokenPattern.MatchString(grant.AccessToken) || strings.Split(grant.AccessToken, ".")[1] != grant.InvocationID {
		return nil, fmt.Errorf("invalid AppPerson invocation context")
	}
	if secret, err := base64.RawURLEncoding.Strict().DecodeString(strings.Split(grant.AccessToken, ".")[2]); err != nil || len(secret) != 32 {
		return nil, fmt.Errorf("invalid AppPerson invocation context")
	}
	if current, _, delegated := AppPersonInvocationToken(ctx); delegated {
		if current != grant.AccessToken {
			return nil, fmt.Errorf("AppPerson invocation context mismatch")
		}
		return ctx, nil
	}
	return context.WithValue(ctx, appPersonBindingKey{}, appPersonBinding{invocation: *grant, channelID: fnCtx.Channel.ID}), nil
}

// AppPersonInvocationToken returns only the request-local callback authority.
// The bool distinguishes ordinary calls from delegated execution.
func AppPersonInvocationToken(ctx context.Context) (token, channelID string, delegated bool) {
	binding, _ := ctx.Value(appPersonBindingKey{}).(appPersonBinding)
	if binding.invocation.AccessToken == "" {
		return "", "", false
	}
	return binding.invocation.AccessToken, binding.channelID, true
}

// HasAppPersonInvocation includes a present null JSON marker for fail-closed validation.
func (c Context) HasAppPersonInvocation() bool {
	return c.AppPersonInvocation != nil || c.appPersonInvocationPresent
}

func validInvocationID(id string) bool {
	return id != "" && len(id) <= 128 && strings.TrimSpace(id) == id && id != "*" && id != "all" && !strings.ContainsAny(id, ".\r\n\x00")
}
