package datasource

import (
	"context"
	"encoding/json"
	"fmt"

	"github.com/channel-io/app-sdk/go/appsdk"
	"github.com/channel-io/app-sdk/go/extension/schemaregistry"
	"google.golang.org/protobuf/encoding/protojson"
)

const (
	MaxQueryAuthorizationTables      = 64
	MaxQueryAuthorizationColumns     = 256
	MaxQueryAuthorizationFilters     = 64
	MaxQueryAuthorizationValues      = 1000
	MaxQueryAuthorizationOutputBytes = 64 * 1024
)

func (b *ExtensionBuilder) AuthorizeQuery(handler appsdk.TypedHandlerFunc[AuthorizeQueryInput, AuthorizeQueryOutput]) *ExtensionBuilder {
	b.base.Func(
		FunctionAuthorizeQuery,
		schemaregistry.Append(FunctionAuthorizeQuery, appsdk.RawHandler(authorizeQueryHandler(handler)))...,
	)
	return b
}

func authorizeQueryHandler(handler appsdk.TypedHandlerFunc[AuthorizeQueryInput, AuthorizeQueryOutput]) appsdk.HandlerFunc {
	return func(ctx context.Context, fnCtx appsdk.Context, params json.RawMessage) (json.RawMessage, error) {
		if err := validateAuthorizeQueryInputPresence(params); err != nil {
			return nil, appsdk.NewError(appsdk.CodeBadRequest, "invalidParams", err.Error())
		}
		input := new(AuthorizeQueryInput)
		if len(params) > 0 && string(params) != "null" {
			if err := (protojson.UnmarshalOptions{DiscardUnknown: false}).Unmarshal(params, input); err != nil {
				return nil, appsdk.NewError(appsdk.CodeBadRequest, "invalidParams", fmt.Sprintf("failed to decode params: %v", err))
			}
		}
		if err := validateAuthorizeQueryInput(input); err != nil {
			return nil, appsdk.NewError(appsdk.CodeBadRequest, "invalidParams", err.Error())
		}

		output, err := handler(ctx, fnCtx, input)
		if err != nil {
			return nil, err
		}
		if err := validateAuthorizeQueryOutput(output); err != nil {
			return nil, appsdk.NewError(appsdk.CodeInternal, "invalidResult", err.Error())
		}

		data, err := marshalAuthorizeQueryOutput(output)
		if err != nil {
			return nil, appsdk.NewError(appsdk.CodeInternal, "invalidResult", "failed to encode authorizeQuery output")
		}
		if len(data) > MaxQueryAuthorizationOutputBytes {
			return nil, appsdk.NewError(appsdk.CodeInternal, "invalidResult", fmt.Sprintf("authorizeQuery output must be at most %d bytes", MaxQueryAuthorizationOutputBytes))
		}
		return data, nil
	}
}

func validateAuthorizeQueryInputPresence(params json.RawMessage) error {
	var object map[string]json.RawMessage
	if err := json.Unmarshal(params, &object); err != nil {
		return fmt.Errorf("failed to decode params: %v", err)
	}
	if _, exists := object["localCatalogAlias"]; !exists {
		if _, snakeCaseExists := object["local_catalog_alias"]; !snakeCaseExists {
			return fmt.Errorf("authorizeQuery localCatalogAlias is required")
		}
	}

	tablesJSON, exists := object["tables"]
	if !exists {
		return fmt.Errorf("authorizeQuery tables are required")
	}
	var tables []map[string]json.RawMessage
	if err := json.Unmarshal(tablesJSON, &tables); err != nil {
		return fmt.Errorf("authorizeQuery tables must be an array")
	}
	for _, table := range tables {
		if _, exists := table["name"]; !exists {
			return fmt.Errorf("authorizeQuery table name is required")
		}
		if _, exists := table["columns"]; !exists {
			return fmt.Errorf("authorizeQuery table columns are required")
		}
	}
	return nil
}

func validateAuthorizeQueryInput(input *AuthorizeQueryInput) error {
	if input == nil || input.GetLocalCatalogAlias() == "" {
		return fmt.Errorf("authorizeQuery localCatalogAlias is required")
	}
	if len(input.GetTables()) == 0 || len(input.GetTables()) > MaxQueryAuthorizationTables {
		return fmt.Errorf("authorizeQuery tables must contain between 1 and %d items", MaxQueryAuthorizationTables)
	}

	tables := make(map[string]struct{}, len(input.GetTables()))
	for _, table := range input.GetTables() {
		if table == nil || table.GetName() == "" {
			return fmt.Errorf("authorizeQuery table name is required")
		}
		if _, exists := tables[table.GetName()]; exists {
			return fmt.Errorf("authorizeQuery table names must be unique")
		}
		tables[table.GetName()] = struct{}{}
		if len(table.GetColumns()) > MaxQueryAuthorizationColumns {
			return fmt.Errorf("authorizeQuery table columns must contain at most %d items", MaxQueryAuthorizationColumns)
		}
		columns := make(map[string]struct{}, len(table.GetColumns()))
		for _, column := range table.GetColumns() {
			if column == "" {
				return fmt.Errorf("authorizeQuery column name is required")
			}
			if _, exists := columns[column]; exists {
				return fmt.Errorf("authorizeQuery column names must be unique")
			}
			columns[column] = struct{}{}
		}
	}
	return nil
}

func validateAuthorizeQueryOutput(output *AuthorizeQueryOutput) error {
	if output == nil {
		return fmt.Errorf("authorizeQuery output is required")
	}
	if len(output.GetFilters()) > MaxQueryAuthorizationFilters {
		return fmt.Errorf("authorizeQuery filters must contain at most %d items", MaxQueryAuthorizationFilters)
	}

	filters := make(map[string]struct{}, len(output.GetFilters()))
	for _, filter := range output.GetFilters() {
		if filter == nil || filter.GetTable() == "" || filter.GetColumn() == "" {
			return fmt.Errorf("authorizeQuery filter table and column are required")
		}
		key := filter.GetTable() + "\x00" + filter.GetColumn()
		if _, exists := filters[key]; exists {
			return fmt.Errorf("authorizeQuery filters must target unique table and column pairs")
		}
		filters[key] = struct{}{}
		if len(filter.GetValues()) > MaxQueryAuthorizationValues {
			return fmt.Errorf("authorizeQuery filter values must contain at most %d items", MaxQueryAuthorizationValues)
		}
		values := make(map[string]struct{}, len(filter.GetValues()))
		for _, value := range filter.GetValues() {
			if _, exists := values[value]; exists {
				return fmt.Errorf("authorizeQuery filter values must be unique")
			}
			values[value] = struct{}{}
		}
	}
	return nil
}

func marshalAuthorizeQueryOutput(output *AuthorizeQueryOutput) (json.RawMessage, error) {
	type filterJSON struct {
		Table  string   `json:"table"`
		Column string   `json:"column"`
		Values []string `json:"values"`
	}
	type outputJSON struct {
		Authorized bool         `json:"authorized"`
		Filters    []filterJSON `json:"filters,omitempty"`
	}

	filters := make([]filterJSON, 0, len(output.GetFilters()))
	for _, filter := range output.GetFilters() {
		filters = append(filters, filterJSON{
			Table:  filter.GetTable(),
			Column: filter.GetColumn(),
			Values: append([]string{}, filter.GetValues()...),
		})
	}
	return json.Marshal(outputJSON{Authorized: output.GetAuthorized(), Filters: filters})
}
