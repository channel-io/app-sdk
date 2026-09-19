package hook

import (
	"fmt"
	"net/url"
	"strings"
	"unicode/utf16"
)

// ValidateOAuthFlowHookResult validates the action shape and plain summary.
// App Store additionally checks redirects against registered redirectOrigins.
func ValidateOAuthFlowHookResult(result *OAuthFlowHookResult) error {
	if result == nil || len(utf16.Encode([]rune(result.GetDetail()))) > 200 {
		return fmt.Errorf("invalid OAuth hook result or detail length")
	}
	switch result.Type {
	case OAuthFlowResultContinue:
		if result.Url != nil {
			return fmt.Errorf("continue cannot include url")
		}
	case OAuthFlowResultRedirect:
		raw := result.GetUrl()
		u, err := url.Parse(raw)
		if err != nil || u.Scheme != "https" || u.Host == "" || u.User != nil || u.Opaque != "" || strings.ContainsAny(raw, "\\\r\n\t ") {
			return fmt.Errorf("redirect requires an HTTPS URL without userinfo")
		}
	default:
		return fmt.Errorf("unsupported OAuth hook result type")
	}
	return nil
}
