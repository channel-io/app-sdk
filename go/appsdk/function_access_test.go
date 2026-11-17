package appsdk

import (
	"encoding/json"
	"testing"
)

func TestAccessMetadataIsValidatedAndCopied(t *testing.T) {
	policy := FunctionAccess{CallerTypes: []string{"manager"}, CredentialScopes: []string{"manager"}}
	def := &functionDefinition{}
	if err := Access(policy)(def); err != nil {
		t.Fatal(err)
	}
	policy.CallerTypes[0] = "system"
	if def.schema.Access.CallerTypes[0] != "manager" {
		t.Fatal("policy changed after registration")
	}
	raw, err := json.Marshal(def.schema)
	if err != nil {
		t.Fatal(err)
	}
	var schema FunctionSchema
	if err := json.Unmarshal(raw, &schema); err != nil {
		t.Fatal(err)
	}
	if schema.Access == nil || schema.Access.CredentialScopes[0] != "manager" {
		t.Fatal("access missing from catalog JSON")
	}
	for _, invalid := range []FunctionAccess{{}, {CallerTypes: []string{"manager"}}, {CallerTypes: []string{"root"}, CredentialScopes: []string{"manager"}}, {CallerTypes: []string{"system"}, CredentialScopes: []string{"caller"}}} {
		if err := Access(invalid)(&functionDefinition{}); err == nil {
			t.Fatal("invalid access accepted")
		}
	}
}
