package native

import "github.com/channel-io/app-sdk/go/appsdk"

var appDataTableFunctionSchemas = []appsdk.FunctionSchema{
	{
		Name:         FunctionCreateAppDataTable,
		Description:  "Create an app-owned logical data table.",
		InputSchema:  createAppDataTableInputSchema(),
		OutputSchema: requestIDOutputSchema(),
	},
	{
		Name:         FunctionCreateAppDataTableSchema,
		Description:  "Create or revise a tenant schema for an app-owned data table.",
		InputSchema:  createAppDataTableSchemaInputSchema(),
		OutputSchema: createAppDataTableSchemaOutputSchema(),
	},
	{
		Name:         FunctionGetAppDataTableSchema,
		Description:  "Get the latest schema for an app-owned data table.",
		InputSchema:  getAppDataTableSchemaInputSchema(),
		OutputSchema: appDataTableSchemaOutputSchema(),
	},
	{
		Name:         FunctionUpsertAppDataTableRows,
		Description:  "Validate and enqueue rows for asynchronous AppDataTable ingestion.",
		InputSchema:  upsertAppDataTableRowsInputSchema(),
		OutputSchema: upsertAppDataTableRowsOutputSchema(),
	},
}

var appNotebookFunctionSchemas = []appsdk.FunctionSchema{
	{
		Name:         FunctionGetAppNotebookVersions,
		Description:  "Get the latest synced app notebook versions.",
		InputSchema:  appNotebookParamsSchema(),
		OutputSchema: getAppNotebookVersionsOutputSchema(),
	},
}

func AppDataTableFunctionSchemas() []appsdk.FunctionSchema {
	ret := make([]appsdk.FunctionSchema, 0, len(appDataTableFunctionSchemas))
	for _, schema := range appDataTableFunctionSchemas {
		ret = append(ret, cloneFunctionSchema(schema))
	}
	return ret
}

func AppDataTableFunctionSchema(name string) (appsdk.FunctionSchema, bool) {
	for _, schema := range appDataTableFunctionSchemas {
		if schema.Name == name {
			return cloneFunctionSchema(schema), true
		}
	}
	return appsdk.FunctionSchema{}, false
}

func AppNotebookFunctionSchemas() []appsdk.FunctionSchema {
	ret := make([]appsdk.FunctionSchema, 0, len(appNotebookFunctionSchemas))
	for _, schema := range appNotebookFunctionSchemas {
		ret = append(ret, cloneFunctionSchema(schema))
	}
	return ret
}

func AppNotebookFunctionSchema(name string) (appsdk.FunctionSchema, bool) {
	for _, schema := range appNotebookFunctionSchemas {
		if schema.Name == name {
			return cloneFunctionSchema(schema), true
		}
	}
	return appsdk.FunctionSchema{}, false
}

func createAppDataTableInputSchema() map[string]any {
	return objectSchema(
		[]string{"appId", "tableName", "columns"},
		map[string]any{
			"appId":             stringSchema(),
			"tableName":         stringSchema(),
			"columns":           columnsSchema(),
			"primaryKeyColumns": stringArraySchema(),
		},
	)
}

func createAppDataTableSchemaInputSchema() map[string]any {
	return objectSchema(
		[]string{"channelId", "appId", "tableName", "columns"},
		map[string]any{
			"channelId":         stringSchema(),
			"appId":             stringSchema(),
			"tableName":         stringSchema(),
			"columns":           columnsSchema(),
			"primaryKeyColumns": stringArraySchema(),
		},
	)
}

func getAppDataTableSchemaInputSchema() map[string]any {
	return objectSchema(
		[]string{"channelId", "appId", "tableName"},
		map[string]any{
			"channelId": stringSchema(),
			"appId":     stringSchema(),
			"tableName": stringSchema(),
		},
	)
}

func upsertAppDataTableRowsInputSchema() map[string]any {
	return objectSchema(
		[]string{"channelId", "appId", "tableName", "rows"},
		map[string]any{
			"channelId": stringSchema(),
			"appId":     stringSchema(),
			"tableName": stringSchema(),
			"rows": map[string]any{
				"type":     "array",
				"minItems": 1,
				"maxItems": 100,
				"items": map[string]any{
					"type":                 "object",
					"additionalProperties": true,
				},
			},
		},
	)
}

func appNotebookParamsSchema() map[string]any {
	return objectSchema(
		[]string{"appId"},
		map[string]any{
			"appId": stringSchema(),
		},
	)
}

func getAppNotebookVersionsOutputSchema() map[string]any {
	return objectSchema(
		[]string{"success", "notebooks"},
		map[string]any{
			"success":      map[string]any{"type": "boolean"},
			"errorMessage": map[string]any{"type": "string"},
			"notebooks": map[string]any{
				"type": "array",
				"items": objectSchema(
					[]string{"notebookKey", "version"},
					map[string]any{
						"notebookKey":      stringSchema(),
						"version":          map[string]any{"type": "integer", "minimum": 1},
						"latestRevisionId": map[string]any{"type": "string"},
						"updatedAt":        map[string]any{"type": "string"},
					},
				),
			},
		},
	)
}

func requestIDOutputSchema() map[string]any {
	return objectSchema(
		[]string{"requestId"},
		map[string]any{
			"requestId": stringSchema(),
		},
	)
}

func createAppDataTableSchemaOutputSchema() map[string]any {
	return objectSchema(
		[]string{"requestId"},
		map[string]any{
			"requestId": stringSchema(),
			"schema":    appDataTableSchemaSchema(),
		},
	)
}

func appDataTableSchemaOutputSchema() map[string]any {
	return objectSchema(
		nil,
		map[string]any{
			"schema": appDataTableSchemaSchema(),
		},
	)
}

func upsertAppDataTableRowsOutputSchema() map[string]any {
	return objectSchema(
		[]string{"requestId", "acceptedRowCount"},
		map[string]any{
			"requestId":        stringSchema(),
			"acceptedRowCount": nonNegativeIntegerSchema(),
		},
	)
}

func appDataTableSchemaSchema() map[string]any {
	return objectSchema(
		[]string{"tableName", "columns"},
		map[string]any{
			"channelId":         map[string]any{"type": "string"},
			"appId":             map[string]any{"type": "string"},
			"tableName":         stringSchema(),
			"columns":           columnsSchema(),
			"primaryKeyColumns": stringArraySchema(),
		},
	)
}

func columnsSchema() map[string]any {
	return map[string]any{
		"type":     "array",
		"minItems": 1,
		"items": objectSchema(
			[]string{"key", "name", "type"},
			map[string]any{
				"key":         stringSchema(),
				"name":        stringSchema(),
				"type":        stringSchema(),
				"nullable":    map[string]any{"type": "boolean"},
				"description": map[string]any{"type": "string"},
			},
		),
	}
}

func objectSchema(required []string, properties map[string]any) map[string]any {
	schema := map[string]any{
		"type":                 "object",
		"properties":           properties,
		"additionalProperties": false,
	}
	if len(required) > 0 {
		schema["required"] = required
	}
	return schema
}

func stringSchema() map[string]any {
	return map[string]any{
		"type":      "string",
		"minLength": 1,
	}
}

func stringArraySchema() map[string]any {
	return map[string]any{
		"type":  "array",
		"items": stringSchema(),
	}
}

func nonNegativeIntegerSchema() map[string]any {
	return map[string]any{"type": "integer", "minimum": 0}
}

func cloneFunctionSchema(schema appsdk.FunctionSchema) appsdk.FunctionSchema {
	return appsdk.FunctionSchema{
		Name:         schema.Name,
		Description:  schema.Description,
		InputSchema:  cloneSchema(schema.InputSchema),
		OutputSchema: cloneSchema(schema.OutputSchema),
	}
}

func cloneSchema(schema map[string]any) map[string]any {
	if schema == nil {
		return nil
	}
	return cloneAny(schema).(map[string]any)
}

func cloneAny(value any) any {
	switch typed := value.(type) {
	case map[string]any:
		cloned := make(map[string]any, len(typed))
		for key, item := range typed {
			cloned[key] = cloneAny(item)
		}
		return cloned
	case []string:
		cloned := make([]string, len(typed))
		copy(cloned, typed)
		return cloned
	case []any:
		cloned := make([]any, len(typed))
		for i, item := range typed {
			cloned[i] = cloneAny(item)
		}
		return cloned
	default:
		return value
	}
}
