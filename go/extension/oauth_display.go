package extension

import (
	"fmt"
	"strings"
	"unicode/utf16"

	sdkv1 "github.com/channel-io/app-sdk/go/internal/gen/channel/app/sdk/v1"
)

// ValidateOAuthStepDisplay validates the optional, plain-text step metadata.
func ValidateOAuthStepDisplay(d *sdkv1.OAuthStepDisplay) error {
	if d == nil {
		return nil
	}
	if strings.TrimSpace(d.Title) == "" || len(utf16.Encode([]rune(d.Title))) > 80 || len(utf16.Encode([]rune(d.GetDescription()))) > 300 {
		return fmt.Errorf("invalid OAuth step title or description length")
	}
	switch d.GetIcon() {
	case "", "installation", "account", "organization", "permission", "settings":
	default:
		return fmt.Errorf("unsupported OAuth step icon")
	}
	for locale, text := range d.I18NMap {
		if locale != "ko" && locale != "en" && locale != "ja" {
			return fmt.Errorf("unsupported OAuth step locale")
		}
		if text == nil || (text.Title != nil && strings.TrimSpace(text.GetTitle()) == "") || len(utf16.Encode([]rune(text.GetTitle()))) > 80 || len(utf16.Encode([]rune(text.GetDescription()))) > 300 {
			return fmt.Errorf("invalid OAuth step translation")
		}
	}
	return nil
}
