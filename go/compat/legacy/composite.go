package legacy

import (
	"context"
	"encoding/json"
	"fmt"

	"github.com/channel-io/app-sdk/go/appsdk"
)

type HandlerFunc func(ctx context.Context, params json.RawMessage, fnCtx appsdk.Context) (json.RawMessage, error)

type Registry map[string]HandlerFunc

type SchemaProvider func() ([]appsdk.FunctionSchema, error)

type Composite struct {
	app          *appsdk.App
	legacy       Registry
	schemaSource SchemaProvider
}

func NewComposite(app *appsdk.App, legacy Registry, schemaSource SchemaProvider) (*Composite, error) {
	if app == nil {
		return nil, fmt.Errorf("sdk app is required")
	}
	for method := range legacy {
		if app.HasMethod(method) {
			return nil, fmt.Errorf("function method registered in both sdk and legacy registries: %s", method)
		}
	}
	return &Composite{app: app, legacy: legacy, schemaSource: schemaSource}, nil
}

func (c *Composite) HandleRequest(ctx context.Context, req appsdk.FunctionRequest) appsdk.FunctionResponse {
	systemVersion := req.SystemVersion
	if systemVersion == "" {
		systemVersion = appsdk.DefaultSystemVersion
	}
	legacyV1 := systemVersion == appsdk.DefaultSystemVersion &&
		(len(c.legacy) > 0 || c.schemaSource != nil)
	if !c.app.SupportsSystemVersion(systemVersion) && !legacyV1 {
		return appsdk.ErrorResponse(
			appsdk.NewVersionMismatchError(systemVersion, c.supportedSystemVersions()),
		)
	}
	if req.Method == appsdk.MethodGetFunctions {
		return c.getFunctions(systemVersion)
	}
	if req.Method == appsdk.MethodGetTestFunctions {
		return c.app.GetTestFunctionsForVersion(systemVersion)
	}
	if c.app.HasMethodForVersion(systemVersion, req.Method) {
		return c.app.HandleRequest(ctx, req)
	}
	if handler, ok := c.legacy[req.Method]; ok && systemVersion == appsdk.DefaultSystemVersion {
		params := req.Params
		if len(params) == 0 {
			params = json.RawMessage(`{}`)
		}
		result, err := handler(ctx, params, req.Context)
		if err != nil {
			return appsdk.ErrorResponse(err)
		}
		return appsdk.FunctionResponse{Result: result}
	}
	return appsdk.ErrorResponse(appsdk.NewError(appsdk.CodeMethodNotFound, "methodNotFound", fmt.Sprintf("cannot find method %s", req.Method)))
}

func (c *Composite) supportedSystemVersions() []string {
	versions := c.app.SupportedSystemVersions()
	if len(c.legacy) == 0 && c.schemaSource == nil {
		return versions
	}
	for _, version := range versions {
		if version == appsdk.DefaultSystemVersion {
			return versions
		}
	}
	return append(versions, appsdk.DefaultSystemVersion)
}

func (c *Composite) HandleJSON(ctx context.Context, body []byte) appsdk.FunctionResponse {
	var req appsdk.FunctionRequest
	if err := json.Unmarshal(body, &req); err != nil {
		return appsdk.ErrorResponse(appsdk.NewError(appsdk.CodeBadRequest, "parseError", "failed to parse function request"))
	}
	return c.HandleRequest(ctx, req)
}

func (c *Composite) getFunctions(systemVersion string) appsdk.FunctionResponse {
	functions := c.app.SchemasForVersion(systemVersion)
	if c.schemaSource != nil && systemVersion == appsdk.DefaultSystemVersion {
		legacySchemas, err := c.schemaSource()
		if err != nil {
			return appsdk.ErrorResponse(err)
		}
		seen := map[string]struct{}{}
		for _, fn := range functions {
			seen[fn.Name] = struct{}{}
		}
		for _, fn := range legacySchemas {
			if _, exists := seen[fn.Name]; exists {
				return appsdk.ErrorResponse(appsdk.NewError(appsdk.CodeInternal, "duplicateFunction", fmt.Sprintf("duplicate function schema: %s", fn.Name)))
			}
			functions = append(functions, fn)
		}
	}

	data, err := json.Marshal(appsdk.GetFunctionsResult{Functions: functions, Success: true, ErrorMessage: ""})
	if err != nil {
		return appsdk.ErrorResponse(err)
	}
	return appsdk.FunctionResponse{Result: data}
}
