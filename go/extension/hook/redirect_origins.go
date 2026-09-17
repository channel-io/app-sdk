package hook

import (
	"fmt"
	"net/netip"
	"net/url"
	"strconv"
	"strings"
)

func validateOAuthRedirectOrigins(hooks []*Config) error {
	for i, config := range hooks {
		if config.GetType() != TypeOAuthBeforeAuthorization && config.GetType() != TypeOAuthAfterAuthorization {
			continue
		}
		for _, origin := range config.RedirectOrigins {
			if !isCanonicalHTTPSOrigin(origin) {
				return fmt.Errorf("hook %d: redirectOrigins must contain canonical HTTPS origins", i)
			}
		}
	}
	return nil
}

func isCanonicalHTTPSOrigin(origin string) bool {
	u, err := url.Parse(origin)
	if err != nil || u.Scheme != "https" || u.Host == "" || u.User != nil ||
		u.Path != "" || u.RawPath != "" || u.RawQuery != "" || u.ForceQuery ||
		u.Fragment != "" || u.Opaque != "" || origin != "https://"+u.Host {
		return false
	}
	host := u.Hostname()
	if host == "" || host != strings.ToLower(host) || strings.ContainsAny(host, "%\\*^|") {
		return false
	}
	for _, c := range host {
		// A canonical URL uses ASCII (punycode for internationalized domains).
		if c <= ' ' || c >= 127 {
			return false
		}
	}
	if addr, err := netip.ParseAddr(host); err == nil {
		canonical := addr.String()
		if addr.Is4In6() {
			bytes := addr.As16()
			canonical = fmt.Sprintf("::ffff:%x:%x", uint16(bytes[12])<<8|uint16(bytes[13]), uint16(bytes[14])<<8|uint16(bytes[15]))
		}
		if canonical != host {
			return false
		}
	} else {
		if strings.ContainsAny(u.Host, "[]") || strings.Contains(host, ":") {
			return false
		}
		last := strings.TrimSuffix(host, ".")
		last = last[strings.LastIndexByte(last, '.')+1:]
		// WHATWG URLs normalize short, octal, and hexadecimal IPv4 spellings.
		if last != "" && strings.Trim(last, "0123456789") == "" {
			return false
		}
		if strings.HasPrefix(last, "0x") && strings.Trim(last[2:], "0123456789abcdef") == "" {
			return false
		}
	}
	if port := u.Port(); port != "" {
		number, err := strconv.Atoi(port)
		return err == nil && number >= 0 && number <= 65535 && number != 443 && strconv.Itoa(number) == port
	}
	return !strings.HasSuffix(u.Host, ":")
}
