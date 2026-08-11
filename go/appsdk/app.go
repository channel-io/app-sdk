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
	functions  map[string]map[string]functionDefinition
	order      map[string][]string
	extensions map[string]ExtensionRegistration
	extOrder   []string
	versions   []string
	versionSet map[string]struct{}
}

func New(options Options) *App {
	return &App{
		options:    options,
		functions:  make(map[string]map[string]functionDefinition),
		order:      make(map[string][]string),
		extensions: make(map[string]ExtensionRegistration),
		versionSet: make(map[string]struct{}),
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

	def := functionDefinition{
		systemVersion: DefaultSystemVersion,
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

	version := normalizeSystemVersion(def.systemVersion)
	if a.functions[version] == nil {
		a.functions[version] = make(map[string]functionDefinition)
	}
	if _, exists := a.functions[version][name]; exists {
		return fmt.Errorf("function already registered for system version %s: %s", version, name)
	}

	def.systemVersion = version
	a.functions[version][name] = def
	a.order[version] = append(a.order[version], name)
	a.noteSystemVersion(version)
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
	return a.HasMethodForVersion(DefaultSystemVersion, method)
}

func (a *App) HasMethodForVersion(systemVersion string, method string) bool {
	_, ok := a.functions[normalizeSystemVersion(systemVersion)][method]
	return ok
}

func (a *App) Methods() []string {
	return a.MethodsForVersion(DefaultSystemVersion)
}

func (a *App) MethodsForVersion(systemVersion string) []string {
	order := a.order[normalizeSystemVersion(systemVersion)]
	methods := make([]string, 0, len(order))
	methods = append(methods, order...)
	return methods
}

func (a *App) Schemas() []FunctionSchema {
	return a.SchemasForVersion(DefaultSystemVersion)
}

func (a *App) TestSchemas() []FunctionSchema {
	return a.TestSchemasForVersion(DefaultSystemVersion)
}

func (a *App) SchemasForVersion(systemVersion string) []FunctionSchema {
	return a.schemasForVersion(systemVersion, false)
}

func (a *App) TestSchemasForVersion(systemVersion string) []FunctionSchema {
	return a.schemasForVersion(systemVersion, true)
}

func (a *App) schemasForVersion(systemVersion string, testOnly bool) []FunctionSchema {
	version := normalizeSystemVersion(systemVersion)
	order := a.order[version]
	functions := make([]FunctionSchema, 0, len(order))
	for _, method := range order {
		def := a.functions[version][method]
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
	return a.GetFunctionsForVersion(DefaultSystemVersion)
}

func (a *App) GetTestFunctions() FunctionResponse {
	return a.GetTestFunctionsForVersion(DefaultSystemVersion)
}

func (a *App) GetFunctionsForVersion(systemVersion string) FunctionResponse {
	return a.getFunctions(a.SchemasForVersion(systemVersion))
}

func (a *App) GetTestFunctionsForVersion(systemVersion string) FunctionResponse {
	return a.getFunctions(a.TestSchemasForVersion(systemVersion))
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
	a.noteSystemVersion(systemVersion)
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
	targets := a.Extensions()
	coveredVersions := make(map[string]struct{}, len(targets))
	for _, target := range targets {
		coveredVersions[target.SystemVersion] = struct{}{}
	}

	for _, systemVersion := range a.SupportedSystemVersions() {
		if _, ok := coveredVersions[systemVersion]; ok {
			continue
		}
		targets = append(targets, ExtensionRegistration{
			Name:          CoreExtensionName,
			SystemVersion: systemVersion,
		})
	}
	return targets
}

func (a *App) HandleJSON(ctx context.Context, body []byte) FunctionResponse {
	var req FunctionRequest
	if err := json.Unmarshal(body, &req); err != nil {
		return ErrorResponse(NewError(CodeBadRequest, "parseError", "failed to parse function request"))
	}
	return a.HandleRequest(ctx, req)
}

func (a *App) HandleRequest(ctx context.Context, req FunctionRequest) FunctionResponse {
	systemVersion := requestSystemVersion(req.SystemVersion)
	if !a.SupportsSystemVersion(systemVersion) {
		return ErrorResponse(NewVersionMismatchError(systemVersion, a.SupportedSystemVersions()))
	}

	if req.Method == MethodGetFunctions {
		return a.GetFunctionsForVersion(systemVersion)
	}
	if req.Method == MethodGetTestFunctions {
		return a.GetTestFunctionsForVersion(systemVersion)
	}

	def, ok := a.functions[systemVersion][req.Method]
	if !ok {
		return ErrorResponse(NewError(CodeMethodNotFound, "methodNotFound", fmt.Sprintf("cannot find method %s", req.Method)))
	}

	params := req.Params
	if len(params) == 0 {
		params = json.RawMessage(`{}`)
	}

	result, err := def.handler(ctx, req.Context, params)
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

func (a *App) SupportedSystemVersions() []string {
	if len(a.versions) == 0 {
		return []string{DefaultSystemVersion}
	}
	versions := make([]string, len(a.versions))
	copy(versions, a.versions)
	return versions
}

func (a *App) SupportsSystemVersion(systemVersion string) bool {
	systemVersion = requestSystemVersion(systemVersion)
	if len(a.versions) == 0 {
		return systemVersion == DefaultSystemVersion
	}
	_, ok := a.versionSet[systemVersion]
	return ok
}

func (a *App) noteSystemVersion(systemVersion string) {
	if _, ok := a.versionSet[systemVersion]; ok {
		return
	}
	a.versionSet[systemVersion] = struct{}{}
	a.versions = append(a.versions, systemVersion)
}

func normalizeSystemVersion(systemVersion string) string {
	systemVersion = strings.TrimSpace(systemVersion)
	if systemVersion == "" {
		return DefaultSystemVersion
	}
	return systemVersion
}

func requestSystemVersion(systemVersion string) string {
	if systemVersion == "" {
		return DefaultSystemVersion
	}
	return systemVersion
}
