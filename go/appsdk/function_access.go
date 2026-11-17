package appsdk

import "fmt"

// FunctionAccess restricts AppPerson discovery/execution, never grants authority.
// Both allowlists are required. Omitting the policy preserves legacy behavior.
type FunctionAccess struct {
	CallerTypes      []string `json:"callerTypes"`
	CredentialScopes []string `json:"credentialScopes"`
}

// Access declares allowed callers AND credential owner scopes for a function.
// This metadata does not replace the handler's own authorization checks.
func Access(policy FunctionAccess) FunctionOption {
	return func(def *functionDefinition) error {
		if len(policy.CallerTypes) == 0 || len(policy.CredentialScopes) == 0 {
			return fmt.Errorf("function access requires caller types and credential scopes")
		}
		for _, caller := range policy.CallerTypes {
			switch caller {
			case "system", "manager", "user", "app":
			default:
				return fmt.Errorf("invalid function access caller type")
			}
		}
		for _, scope := range policy.CredentialScopes {
			if scope != "channel" && scope != "manager" {
				return fmt.Errorf("invalid function access credential scope")
			}
		}
		def.schema.Access = &FunctionAccess{CallerTypes: append([]string(nil), policy.CallerTypes...), CredentialScopes: append([]string(nil), policy.CredentialScopes...)}
		return nil
	}
}
