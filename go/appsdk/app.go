package appsdk

import (
	"context"
	"encoding/json"
	"fmt"
	"strings"
)

type Options struct {
	AppID       string
	AppSecret   string
	Debug       bool
	ErrorMapper ErrorMapper
}

type Extension interface {
	Register(app *App) error
}

type App struct {
	options    Options
	functions  map[string]functionDefinition
	order      []string
	extensions map[string]ExtensionRegistration
	extOrder   []string
}

func New(options Options) *App {
	return &App{
		options:    options,
		functions:  make(map[string]functionDefinition),
		extensions: make(map[string]ExtensionRegistration),
	}
}

func (a *App) Options() Options {
	return a.options
}

func (a *App) Func(name string, opts ...FunctionOption) {
	if err := a.RegisterFunc(name, opts...); err != nil {
		panic(err)
	}
}

func (a *App) RegisterFunc(name string, opts ...FunctionOption) error {
	if name == "" {
		return fmt.Errorf("function name is required")
	}
	if _, exists := a.functions[name]; exists {
		return fmt.Errorf("function already registered: %s", name)
	}

	def := functionDefinition{
		schema: FunctionSchema{
			Name:        name,
			InputSchema: map[string]any{"type": "object"},
		},
	}

	for _, opt := range opts {
		if opt == nil {
			continue
		}
		if err := opt(&def); err != nil {
			return err
		}
	}
	if def.handler == nil {
		return fmt.Errorf("function handler is required: %s", name)
	}

	a.functions[name] = def
	a.order = append(a.order, name)
	return nil
}

func (a *App) TestFunc(name string, opts ...FunctionOption) {
	if err := a.RegisterTestFunc(name, opts...); err != nil {
		panic(err)
	}
}

func (a *App) RegisterTestFunc(name string, opts ...FunctionOption) error {
	opts = append([]FunctionOption{TestOnly()}, opts...)
	return a.RegisterFunc(name, opts...)
}

func (a *App) Use(extension Extension) error {
	return extension.Register(a)
}

func (a *App) HasMethod(method string) bool {
	_, ok := a.functions[method]
	return ok
}

func (a *App) Methods() []string {
	methods := make([]string, 0, len(a.order))
	methods = append(methods, a.order...)
	return methods
}

func (a *App) Schemas() []FunctionSchema {
	return a.schemas(false)
}

func (a *App) TestSchemas() []FunctionSchema {
	return a.schemas(true)
}

func (a *App) schemas(testOnly bool) []FunctionSchema {
	functions := make([]FunctionSchema, 0, len(a.order))
	for _, method := range a.order {
		def := a.functions[method]
		if def.hidden {
			continue
		}
		if def.test != testOnly {
			continue
		}
		functions = append(functions, def.schema)
	}
	return functions
}

func (a *App) GetFunctions() FunctionResponse {
	return a.getFunctions(a.Schemas())
}

func (a *App) GetTestFunctions() FunctionResponse {
	return a.getFunctions(a.TestSchemas())
}

func (a *App) getFunctions(functions []FunctionSchema) FunctionResponse {
	data, err := json.Marshal(GetFunctionsResult{Functions: functions, Success: true, ErrorMessage: ""})
	if err != nil {
		return ErrorResponse(err)
	}
	return FunctionResponse{Result: data}
}

func (a *App) DeclareExtension(name string, systemVersion string) error {
	name = strings.TrimSpace(name)
	systemVersion = strings.TrimSpace(systemVersion)
	if name == "" {
		return fmt.Errorf("extension name is required")
	}
	if systemVersion == "" {
		systemVersion = DefaultSystemVersion
	}

	key := name + "\x00" + systemVersion
	if _, ok := a.extensions[key]; ok {
		return nil
	}
	a.extensions[key] = ExtensionRegistration{Name: name, SystemVersion: systemVersion}
	a.extOrder = append(a.extOrder, key)
	return nil
}

func (a *App) Extensions() []ExtensionRegistration {
	extensions := make([]ExtensionRegistration, 0, len(a.extOrder))
	for _, key := range a.extOrder {
		extensions = append(extensions, a.extensions[key])
	}
	return extensions
}

func (a *App) AutoRegisterTargets() []ExtensionRegistration {
	extensions := a.Extensions()
	if len(extensions) > 0 {
		return extensions
	}
	return []ExtensionRegistration{{
		Name:          CoreExtensionName,
		SystemVersion: DefaultSystemVersion,
	}}
}

func (a *App) HandleJSON(ctx context.Context, body []byte) FunctionResponse {
	var req FunctionRequest
	if err := json.Unmarshal(body, &req); err != nil {
		return ErrorResponse(NewError(CodeBadRequest, "parseError", "failed to parse function request"))
	}
	return a.HandleRequest(ctx, req)
}

func (a *App) HandleRequest(ctx context.Context, req FunctionRequest) FunctionResponse {
	if req.Method == MethodGetFunctions {
		return a.GetFunctions()
	}
	if req.Method == MethodGetTestFunctions {
		return a.GetTestFunctions()
	}

	def, ok := a.functions[req.Method]
	if !ok {
		return ErrorResponse(NewError(CodeMethodNotFound, "methodNotFound", fmt.Sprintf("cannot find method %s", req.Method)))
	}

	params := req.Params
	if len(params) == 0 {
		params = json.RawMessage(`{}`)
	}

	boundCtx, err := BindAppPersonInvocation(ctx, req.Context)
	if err != nil {
		return ErrorResponse(NewError(CodeBadRequest, "invalidParams", "invalid AppPerson invocation context"))
	}
	result, err := def.handler(boundCtx, req.Context, params)
	if err != nil {
		if def.errorMapper != nil {
			err = def.errorMapper(err)
		} else if a.options.ErrorMapper != nil {
			err = a.options.ErrorMapper(err)
		}
		return ErrorResponse(err)
	}
	return FunctionResponse{Result: result}
}
