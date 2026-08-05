package appsdk_test

import (
	"encoding/json"
	"reflect"
	"sort"
	"strings"
	"testing"

	"github.com/channel-io/app-sdk/go/appsdk"
	sdkv1 "github.com/channel-io/app-sdk/go/internal/gen/channel/app/sdk/v1"
	"google.golang.org/protobuf/reflect/protoreflect"
)

func TestCoreDTOJSONFieldsMatchProto(t *testing.T) {
	tests := []struct {
		name       string
		runtime    any
		descriptor protoreflect.MessageDescriptor
	}{
		{
			name:       "Caller",
			runtime:    appsdk.Caller{},
			descriptor: sdkv1.File_channel_app_sdk_v1_context_proto.Messages().ByName("Caller"),
		},
		{
			name:       "Channel",
			runtime:    appsdk.Channel{},
			descriptor: sdkv1.File_channel_app_sdk_v1_context_proto.Messages().ByName("Channel"),
		},
		{
			name:       "Chat",
			runtime:    appsdk.Chat{},
			descriptor: sdkv1.File_channel_app_sdk_v1_context_proto.Messages().ByName("Chat"),
		},
		{
			name:       "User",
			runtime:    appsdk.User{},
			descriptor: sdkv1.File_channel_app_sdk_v1_context_proto.Messages().ByName("User"),
		},
		{
			name:       "UserChat",
			runtime:    appsdk.UserChat{},
			descriptor: sdkv1.File_channel_app_sdk_v1_context_proto.Messages().ByName("UserChat"),
		},
		{
			name:       "WebhookEndpointContext",
			runtime:    appsdk.WebhookEndpointContext{},
			descriptor: sdkv1.File_channel_app_sdk_v1_context_proto.Messages().ByName("WebhookEndpointContext"),
		},
		{
			name:       "FunctionContext",
			runtime:    appsdk.Context{},
			descriptor: sdkv1.File_channel_app_sdk_v1_context_proto.Messages().ByName("FunctionContext"),
		},
		{
			name:       "FunctionRequest",
			runtime:    appsdk.FunctionRequest{},
			descriptor: sdkv1.File_channel_app_sdk_v1_function_proto.Messages().ByName("FunctionRequest"),
		},
		{
			name:       "FunctionResponse",
			runtime:    appsdk.FunctionResponse{},
			descriptor: sdkv1.File_channel_app_sdk_v1_function_proto.Messages().ByName("FunctionResponse"),
		},
		{
			name:       "FunctionSchema",
			runtime:    appsdk.FunctionSchema{},
			descriptor: sdkv1.File_channel_app_sdk_v1_function_proto.Messages().ByName("FunctionSchema"),
		},
		{
			name:       "GetFunctionsResult",
			runtime:    appsdk.GetFunctionsResult{},
			descriptor: sdkv1.File_channel_app_sdk_v1_function_proto.Messages().ByName("GetFunctionsResult"),
		},
		{
			name:       "FunctionErrorResponse",
			runtime:    appsdk.FunctionErrorResponse{},
			descriptor: sdkv1.File_channel_app_sdk_v1_error_proto.Messages().ByName("FunctionError"),
		},
		{
			name:       "FunctionError",
			runtime:    appsdk.FunctionError{},
			descriptor: sdkv1.File_channel_app_sdk_v1_error_proto.Messages().ByName("FunctionError"),
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got := jsonFieldNames(reflect.TypeOf(tt.runtime))
			want := protoJSONFieldNames(tt.descriptor)
			if !reflect.DeepEqual(got, want) {
				t.Fatalf("runtime JSON fields drifted from proto: got %v want %v", got, want)
			}
		})
	}
}

func TestContextAcceptsLegacyAuthTokenAlias(t *testing.T) {
	var got appsdk.Context
	if err := json.Unmarshal([]byte(`{"auth_token":"legacy-token"}`), &got); err != nil {
		t.Fatal(err)
	}
	if got.GetAuthToken() != "legacy-token" {
		t.Fatalf("expected legacy auth token alias to be accepted, got %q", got.GetAuthToken())
	}
}

func TestContextDecodesManagerWebhookEndpoints(t *testing.T) {
	var got appsdk.Context
	if err := json.Unmarshal([]byte(`{"webhooks":{"provider.events":{"url":"https://app-store.example.com/hook"}}}`), &got); err != nil {
		t.Fatal(err)
	}
	if got.Webhooks["provider.events"].URL != "https://app-store.example.com/hook" {
		t.Fatalf("unexpected webhook context: %#v", got.Webhooks)
	}
}

func jsonFieldNames(typ reflect.Type) []string {
	if typ.Kind() == reflect.Pointer {
		typ = typ.Elem()
	}

	fields := make([]string, 0, typ.NumField())
	for i := 0; i < typ.NumField(); i++ {
		field := typ.Field(i)
		if !field.IsExported() {
			continue
		}
		name := strings.Split(field.Tag.Get("json"), ",")[0]
		if name == "-" {
			continue
		}
		if name == "" {
			name = lowerCamel(field.Name)
		}
		fields = append(fields, name)
	}
	sort.Strings(fields)
	return fields
}

func protoJSONFieldNames(descriptor protoreflect.MessageDescriptor) []string {
	fields := descriptor.Fields()
	names := make([]string, 0, fields.Len())
	for i := 0; i < fields.Len(); i++ {
		names = append(names, fields.Get(i).JSONName())
	}
	sort.Strings(names)
	return names
}

func lowerCamel(name string) string {
	if name == "" {
		return ""
	}
	return strings.ToLower(name[:1]) + name[1:]
}
