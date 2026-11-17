package oauth

import (
	"fmt"
	"net/url"

	"google.golang.org/protobuf/types/known/structpb"
)

// Endpoint returns a plain resolver URL, serialized as a JSON string.
func Endpoint(url string) *structpb.Value {
	return structpb.NewStringValue(url)
}

// SecretEndpoint asks App Store to encrypt this URL in state and credential storage.
// Authorization URLs still reach the browser when starting authorization.
func SecretEndpoint(url string) *structpb.Value {
	return structpb.NewStructValue(&structpb.Struct{Fields: map[string]*structpb.Value{
		"value":  structpb.NewStringValue(url),
		"secret": structpb.NewBoolValue(true),
	}})
}

func validateEndpoint(endpoint *structpb.Value) error {
	var raw string
	switch value := endpoint.GetKind().(type) {
	case *structpb.Value_StringValue:
		raw = value.StringValue
	case *structpb.Value_StructValue:
		fields := value.StructValue.GetFields()
		if len(fields) != 2 || !fields["secret"].GetBoolValue() {
			return fmt.Errorf("invalid OAuth secret endpoint")
		}
		raw = fields["value"].GetStringValue()
	default:
		return fmt.Errorf("invalid OAuth endpoint")
	}
	parsed, err := url.Parse(raw)
	if err != nil || parsed.Scheme == "" || parsed.Host == "" {
		return fmt.Errorf("invalid OAuth endpoint URL")
	}
	return nil
}
