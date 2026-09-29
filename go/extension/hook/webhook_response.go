package hook

import (
	"fmt"
	"mime"
	"strings"
	"unicode/utf8"
)

func validateHookMetadata(hooks []*Config) error {
	if err := validateOAuthHookMetadata(hooks); err != nil {
		return err
	}
	for _, config := range hooks {
		response := config.GetWebhook().GetResponse()
		if response == nil {
			continue
		}
		if config.GetType() != TypeWebhookReceived {
			return fmt.Errorf("webhook.response is only supported for webhook.received")
		}
		if response.StatusCode < 200 || response.StatusCode > 299 {
			return fmt.Errorf("webhook.response.statusCode must be between 200 and 299")
		}
		mediaType, _, err := mime.ParseMediaType(response.ContentType)
		if err != nil || !strings.Contains(mediaType, "/") || strings.ContainsFunc(response.ContentType, func(c rune) bool { return c < 0x20 && c != '\t' || c == 0x7f }) {
			return fmt.Errorf("webhook.response.contentType must be a valid MIME type without invalid header characters")
		}
		if !utf8.ValidString(response.Body) || len(response.Body) > 64*1024 {
			return fmt.Errorf("webhook.response.body must be UTF-8 and at most 64 KiB")
		}
		if (response.StatusCode == 204 || response.StatusCode == 205) && response.Body != "" {
			return fmt.Errorf("webhook.response.body must be empty for status 204 or 205")
		}
	}
	return nil
}
