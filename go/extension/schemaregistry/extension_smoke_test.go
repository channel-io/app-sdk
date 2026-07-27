package schemaregistry_test

import (
	"context"
	"reflect"
	"testing"

	"github.com/channel-io/app-sdk/go/appsdk"
	"github.com/channel-io/app-sdk/go/extension/alftask"
	"github.com/channel-io/app-sdk/go/extension/apikey"
	"github.com/channel-io/app-sdk/go/extension/calendar"
	"github.com/channel-io/app-sdk/go/extension/command"
	"github.com/channel-io/app-sdk/go/extension/commerce"
	"github.com/channel-io/app-sdk/go/extension/config"
	"github.com/channel-io/app-sdk/go/extension/customtab"
	"github.com/channel-io/app-sdk/go/extension/datasource"
	"github.com/channel-io/app-sdk/go/extension/hook"
	"github.com/channel-io/app-sdk/go/extension/mailrelay"
	"github.com/channel-io/app-sdk/go/extension/messaging"
	"github.com/channel-io/app-sdk/go/extension/notebook"
	"github.com/channel-io/app-sdk/go/extension/oauth"
	"github.com/channel-io/app-sdk/go/extension/order"
	"github.com/channel-io/app-sdk/go/extension/polling"
	"github.com/channel-io/app-sdk/go/extension/schemaregistry"
	"github.com/channel-io/app-sdk/go/extension/store"
	"github.com/channel-io/app-sdk/go/extension/widget"
	"github.com/channel-io/app-sdk/go/extension/wms"
	"github.com/channel-io/app-sdk/go/testkit"
)

type extensionSmokeSpec struct {
	name          string
	systemVersion string
	functions     []string
	build         func() appsdk.Extension
}

var extensionSmokeSpecs = []extensionSmokeSpec{
	{
		name:          alftask.ExtensionName,
		systemVersion: alftask.SystemVersion,
		functions: []string{
			alftask.FunctionGetTasks,
		},
		build: func() appsdk.Extension {
			return alftask.Extension().
				GetTasks(smokeZero[alftask.GetTasksRequest, alftask.GetTasksResponse]())
		},
	},
	{
		name:          apikey.ExtensionName,
		systemVersion: apikey.SystemVersion,
		functions: []string{
			apikey.FunctionGetAuthConfig,
			apikey.FunctionValidateCredentials,
		},
		build: func() appsdk.Extension {
			return apikey.Extension().
				GetAuthConfig(smokeZero[apikey.GetAuthConfigRequest, apikey.AuthConfig]()).
				ValidateCredentials(smokeZero[apikey.ValidateCredentialsRequest, apikey.ValidateCredentialsResponse]())
		},
	},
	{
		name:          calendar.ExtensionName,
		systemVersion: calendar.SystemVersion,
		functions: []string{
			calendar.FunctionCancelBooking,
			calendar.FunctionCreateBooking,
			calendar.FunctionGetBooking,
			calendar.FunctionGetAvailability,
			calendar.FunctionListCalendars,
			calendar.FunctionListEventTypes,
		},
		build: func() appsdk.Extension {
			return calendar.Extension().
				CancelBooking(smokeZero[calendar.CancelBookingRequest, calendar.CancelBookingResponse]()).
				CreateBooking(smokeZero[calendar.CreateBookingRequest, calendar.Booking]()).
				GetBooking(smokeZero[calendar.GetBookingRequest, calendar.Booking]()).
				GetAvailability(smokeZero[calendar.GetAvailabilityRequest, calendar.GetAvailabilityResponse]()).
				ListCalendars(smokeZero[calendar.ListCalendarsRequest, calendar.ListCalendarsResponse]()).
				ListEventTypes(smokeZero[calendar.ListEventTypesRequest, calendar.ListEventTypesResponse]())
		},
	},
	{
		name:          commerce.ExtensionName,
		systemVersion: commerce.SystemVersion,
		functions: []string{
			commerce.FunctionGetAppConfigs,
			commerce.FunctionGetOrders,
			commerce.FunctionRequestCancelOrder,
			commerce.FunctionRequestReturnOrder,
			commerce.FunctionAcceptReturnOrder,
			commerce.FunctionRequestExchangeOrder,
			commerce.FunctionGetExchangeableItems,
			commerce.FunctionChangeShippingAddress,
		},
		build: func() appsdk.Extension {
			return commerce.Extension().
				GetAppConfigs(smokeZero[commerce.GetAppConfigsInput, commerce.GetAppConfigsOutput]()).
				GetOrders(smokeZero[commerce.GetOrdersInput, commerce.GetOrdersOutput]()).
				RequestCancelOrder(smokeZero[commerce.CancelOrderInput, commerce.ActionResult]()).
				RequestReturnOrder(smokeZero[commerce.ReturnOrderInput, commerce.ActionResult]()).
				AcceptReturnOrder(smokeZero[commerce.AcceptReturnOrderInput, commerce.ActionResult]()).
				RequestExchangeOrder(smokeZero[commerce.ExchangeOrderInput, commerce.ActionResult]()).
				GetExchangeableItems(smokeZero[commerce.GetExchangeableItemsInput, commerce.GetExchangeableItemsOutput]()).
				ChangeShippingAddress(smokeZero[commerce.ChangeShippingAddressInput, commerce.ActionResult]())
		},
	},
	{
		name:          command.ExtensionName,
		systemVersion: command.SystemVersion,
		functions: []string{
			command.FunctionExecute,
			command.FunctionGetSuggestions,
			command.FunctionGetCommands,
		},
		build: func() appsdk.Extension {
			return command.Extension().
				Execute(command.FunctionExecute, smokeZero[command.ExecuteRequest, command.ActionResult]()).
				Suggestions(command.FunctionGetSuggestions, smokeZero[command.GetSuggestionsRequest, command.GetSuggestionsResponse]()).
				GetCommands(smokeZero[command.GetCommandsRequest, command.GetCommandsResponse]())
		},
	},
	{
		name:          config.ExtensionName,
		systemVersion: config.SystemVersion,
		functions: []string{
			config.FunctionGetConfigSchema,
			config.FunctionValidateStoredConfig,
		},
		build: func() appsdk.Extension {
			return config.Extension().
				GetConfigSchema(smokeZero[config.GetConfigSchemaRequest, config.GetConfigSchemaResponse]()).
				ValidateStoredConfig(smokeZero[config.ValidateStoredConfigRequest, config.ValidateStoredConfigResponse]())
		},
	},
	{
		name:          customtab.ExtensionName,
		systemVersion: customtab.SystemVersion,
		functions: []string{
			customtab.FunctionAction,
			customtab.FunctionGetCustomTabs,
		},
		build: func() appsdk.Extension {
			return customtab.Extension().
				Action(customtab.FunctionAction, smokeZero[customtab.ActionRequest, customtab.ActionResult]()).
				GetCustomTabs(smokeZero[customtab.GetCustomTabsRequest, customtab.GetCustomTabsResponse]())
		},
	},
	{
		name:          datasource.ExtensionName,
		systemVersion: datasource.SystemVersion,
		functions: []string{
			datasource.FunctionDescribeTable,
			datasource.FunctionListCatalogs,
			datasource.FunctionListTables,
		},
		build: func() appsdk.Extension {
			return datasource.Extension().
				DescribeTable(smokeZero[datasource.DescribeTableInput, datasource.DescribeTableOutput]()).
				ListCatalogs(smokeZero[datasource.ListCatalogsInput, datasource.ListCatalogsOutput]()).
				ListTables(smokeZero[datasource.ListTablesInput, datasource.ListTablesOutput]())
		},
	},
	{
		name:          hook.ExtensionName,
		systemVersion: hook.SystemVersion,
		functions: []string{
			hook.FunctionGetHooks,
		},
		build: func() appsdk.Extension {
			return hook.Extension().
				GetHooks(smokeZero[hook.GetHooksRequest, hook.GetHooksResponse]())
		},
	},
	{
		name:          mailrelay.ExtensionName,
		systemVersion: mailrelay.SystemVersion,
		functions: []string{
			mailrelay.FunctionOnMailReceived,
		},
		build: func() appsdk.Extension {
			return mailrelay.Extension().
				OnMailReceived(smokeZero[mailrelay.InboundInput, mailrelay.InboundOutput]())
		},
	},
	{
		name:          messaging.ExtensionName,
		systemVersion: messaging.SystemVersion,
		functions: []string{
			messaging.FunctionInboxGetCustomEditorWAM,
			messaging.FunctionInboxGetMediumMessageErrorReason,
			messaging.FunctionInboxGetMediumTopicSelectorWAM,
			messaging.FunctionInboxGetWritingTypes,
			messaging.FunctionInboxOnMediumMessageCreated,
			messaging.FunctionInboxOnMediumUserChatClosed,
			messaging.FunctionPrebuiltBuildMediumTopics,
			messaging.FunctionPrebuiltGetCustomEditorWAM,
			messaging.FunctionPrebuiltGetDefaultOptions,
			messaging.FunctionPrebuiltGetMediumTopicBuilderWAM,
			messaging.FunctionPrebuiltGetWritingTypes,
			messaging.FunctionPrebuiltValidateEntity,
		},
		build: func() appsdk.Extension {
			return messaging.Extension().
				InboxGetCustomEditorWAM(smokeZero[messaging.InboxGetCustomEditorWAMInput, messaging.WAMResult]()).
				InboxGetMediumMessageErrorReason(smokeZero[messaging.InboxGetMediumMessageErrorReasonInput, messaging.InboxGetMediumMessageErrorReasonOutput]()).
				InboxGetMediumTopicSelectorWAM(smokeZero[messaging.InboxGetMediumTopicSelectorWAMInput, messaging.WAMResult]()).
				InboxGetWritingTypes(smokeZero[messaging.InboxGetWritingTypesInput, messaging.InboxGetWritingTypesOutput]()).
				InboxOnMediumMessageCreated(smokeZero[messaging.OnMediumMessageCreatedInput, messaging.OnMediumMessageCreatedOutput]()).
				InboxOnMediumUserChatClosed(smokeZero[messaging.InboxOnMediumUserChatClosedInput, messaging.InboxOnMediumUserChatClosedOutput]()).
				PrebuiltBuildMediumTopics(smokeZero[messaging.PrebuiltBuildMediumTopicsInput, messaging.PrebuiltBuildMediumTopicsOutput]()).
				PrebuiltGetCustomEditorWAM(smokeZero[messaging.PrebuiltGetCustomEditorWAMInput, messaging.WAMResult]()).
				PrebuiltGetDefaultOptions(smokeZero[messaging.PrebuiltGetDefaultOptionsInput, messaging.PrebuiltGetDefaultOptionsOutput]()).
				PrebuiltGetMediumTopicBuilderSelectorWAM(smokeZero[messaging.PrebuiltGetMediumTopicBuilderSelectorWAMInput, messaging.WAMResult]()).
				PrebuiltGetWritingTypes(smokeZero[messaging.PrebuiltGetWritingTypesInput, messaging.PrebuiltGetWritingTypesOutput]()).
				PrebuiltValidateEntity(smokeZero[messaging.PrebuiltValidateEntityInput, messaging.PrebuiltValidateEntityOutput]())
		},
	},
	{
		name:          oauth.ExtensionName,
		systemVersion: oauth.SystemVersion,
		functions: []string{
			oauth.FunctionGetAuthConfig,
			oauth.FunctionValidateCredentials,
		},
		build: func() appsdk.Extension {
			return oauth.Extension().
				GetAuthConfig(smokeZero[oauth.GetAuthConfigRequest, oauth.AuthConfig]()).
				ValidateCredentials(smokeZero[oauth.CredentialValidationInput, oauth.CredentialValidationResult]())
		},
	},
	{
		name:          notebook.ExtensionName,
		systemVersion: notebook.SystemVersion,
		functions: []string{
			notebook.FunctionGetNotebooks,
		},
		build: func() appsdk.Extension {
			return notebook.Extension().
				GetNotebooks(smokeZero[notebook.GetNotebooksRequest, notebook.GetNotebooksResponse]())
		},
	},
	{
		name:          order.ExtensionName,
		systemVersion: order.SystemVersion,
		functions: []string{
			order.FunctionCancelOrder,
			order.FunctionGetAppConfigs,
			order.FunctionGetOrders,
			order.FunctionChangeShippingAddress,
			order.FunctionExchangeOrder,
			order.FunctionGetExchangeableItems,
			order.FunctionReturnOrder,
		},
		build: func() appsdk.Extension {
			return order.Extension().
				CancelOrder(smokeZero[order.CancelOrderInput, order.SuccessOutput]()).
				GetAppConfigs(smokeZero[order.GetAppConfigsInput, order.GetAppConfigsOutput]()).
				GetOrders(smokeZero[order.GetOrdersInput, order.GetOrdersOutput]()).
				ChangeShippingAddress(smokeZero[order.ChangeShippingAddressInput, order.SuccessOutput]()).
				ExchangeOrder(smokeZero[order.ExchangeOrderInput, order.SuccessOutput]()).
				GetExchangeableItems(smokeZero[order.GetExchangeableItemsInput, order.GetExchangeableItemsOutput]()).
				ReturnOrder(smokeZero[order.ReturnOrderInput, order.SuccessOutput]())
		},
	},
	{
		name:          polling.ExtensionName,
		systemVersion: polling.SystemVersion,
		functions: []string{
			polling.FunctionGetPollers,
			polling.FunctionGetChannels,
		},
		build: func() appsdk.Extension {
			return polling.Extension().
				GetPollers(smokeZero[polling.GetPollersRequest, polling.GetPollersResponse]()).
				GetChannels(smokeZero[polling.GetChannelsRequest, polling.GetChannelsResponse]())
		},
	},
	{
		name:          store.ExtensionName,
		systemVersion: store.SystemVersion,
		functions: []string{
			store.FunctionGetStoreProfile,
		},
		build: func() appsdk.Extension {
			return store.Extension().
				GetStoreProfile(smokeZero[store.GetStoreProfileRequest, store.GetStoreProfileResponse]())
		},
	},
	{
		name:          widget.ExtensionName,
		systemVersion: widget.SystemVersion,
		functions: []string{
			widget.FunctionGetWidgets,
			widget.FunctionAction,
		},
		build: func() appsdk.Extension {
			return widget.Extension().
				GetWidgets(smokeZero[widget.GetWidgetsRequest, widget.GetWidgetsResponse]()).
				Action(widget.FunctionAction, smokeZero[widget.ActionRequest, widget.ActionResult]())
		},
	},
	{
		name:          wms.ExtensionName,
		systemVersion: wms.SystemVersion,
		functions: []string{
			wms.FunctionCancelOrder,
			wms.FunctionRestoreCanceledOrder,
			wms.FunctionGetOrder,
			wms.FunctionGetOrders,
			wms.FunctionGetShopID,
			wms.FunctionChangeShippingAddress,
			wms.FunctionExchangeOrder,
			wms.FunctionRestoreExchangedOrder,
			wms.FunctionGetSupportedCommerces,
			wms.FunctionRestoreReturnedOrder,
			wms.FunctionReturnOrder,
			wms.FunctionGetAppConfigs,
			wms.FunctionOrderGetOrders,
			wms.FunctionOrderRequestCancelOrder,
			wms.FunctionOrderRestoreCanceledOrder,
			wms.FunctionOrderRequestReturnOrder,
			wms.FunctionOrderRestoreReturnedOrder,
			wms.FunctionOrderRequestExchangeOrder,
			wms.FunctionOrderRestoreExchangedOrder,
			wms.FunctionOrderChangeShippingAddress,
		},
		build: func() appsdk.Extension {
			return wms.Extension().
				CancelOrder(smokeZero[wms.CancelOrderRequest, wms.SuccessResponse]()).
				RestoreCanceledOrder(smokeZero[wms.RestoreOrderRequest, wms.SuccessResponse]()).
				GetOrder(smokeZero[wms.GetOrderRequest, wms.GetOrderResponse]()).
				GetOrders(smokeZero[wms.GetOrdersRequest, wms.GetOrdersResponse]()).
				GetShopID(smokeZero[wms.GetShopIDRequest, wms.GetShopIDResponse]()).
				ChangeShippingAddress(smokeZero[wms.ChangeShippingAddressRequest, wms.SuccessResponse]()).
				ExchangeOrder(smokeZero[wms.ExchangeOrderRequest, wms.SuccessResponse]()).
				RestoreExchangedOrder(smokeZero[wms.RestoreOrderRequest, wms.SuccessResponse]()).
				GetSupportedCommerces(smokeZero[wms.GetSupportedCommercesRequest, wms.GetSupportedCommercesResponse]()).
				RestoreReturnedOrder(smokeZero[wms.RestoreOrderRequest, wms.SuccessResponse]()).
				ReturnOrder(smokeZero[wms.ReturnOrderRequest, wms.SuccessResponse]()).
				GetAppConfigs(smokeZero[wms.GetAppConfigsRequest, wms.GetAppConfigsResponse]()).
				OrderGetOrders(smokeZero[wms.OrderGetOrdersRequest, wms.OrderGetOrdersResponse]()).
				OrderRequestCancelOrder(smokeZero[wms.OrderActionRequest, wms.OrderActionResponse]()).
				OrderRestoreCanceledOrder(smokeZero[wms.OrderActionRequest, wms.OrderActionResponse]()).
				OrderRequestReturnOrder(smokeZero[wms.OrderActionRequest, wms.OrderActionResponse]()).
				OrderRestoreReturnedOrder(smokeZero[wms.OrderActionRequest, wms.OrderActionResponse]()).
				OrderRequestExchangeOrder(smokeZero[wms.OrderActionRequest, wms.OrderActionResponse]()).
				OrderRestoreExchangedOrder(smokeZero[wms.OrderActionRequest, wms.OrderActionResponse]()).
				OrderChangeShippingAddress(smokeZero[wms.OrderChangeShippingAddressRequest, wms.OrderActionResponse]())
		},
	},
}

func TestExtensionGetFunctionsSchemaParityByExtension(t *testing.T) {
	for _, spec := range extensionSmokeSpecs {
		t.Run(spec.name, func(t *testing.T) {
			app := appsdk.New(appsdk.Options{AppID: "app"})
			if err := app.Use(spec.build()); err != nil {
				t.Fatal(err)
			}

			got := testkit.Functions(t, app)
			want := canonicalSchemasFor(t, spec.functions)
			if !reflect.DeepEqual(got, want) {
				t.Fatalf("%s getFunctions schema drifted from canonical registry", spec.name)
			}

			targets := app.AutoRegisterTargets()
			if len(targets) != 1 {
				t.Fatalf("expected one auto-register target, got %+v", targets)
			}
			if targets[0].Name != spec.name || targets[0].SystemVersion != spec.systemVersion {
				t.Fatalf("unexpected auto-register target: %+v", targets[0])
			}
		})
	}
}

func TestExtensionSmokeSpecsCoverCanonicalRegistry(t *testing.T) {
	covered := make(map[string]string)
	for _, spec := range extensionSmokeSpecs {
		for _, name := range spec.functions {
			if previous, ok := covered[name]; ok {
				t.Fatalf("function %s is covered by both %s and %s", name, previous, spec.name)
			}
			covered[name] = spec.name
		}
	}

	for _, schema := range schemaregistry.Schemas() {
		if _, ok := covered[schema.Name]; !ok {
			t.Fatalf("canonical function %s has no extension smoke coverage", schema.Name)
		}
	}
	if len(covered) != len(schemaregistry.Schemas()) {
		t.Fatalf("smoke specs cover %d functions, canonical registry has %d", len(covered), len(schemaregistry.Schemas()))
	}

	for _, name := range []string{
		config.ExtensionName,
		oauth.ExtensionName,
		calendar.ExtensionName,
		command.ExtensionName,
		widget.ExtensionName,
		customtab.ExtensionName,
		hook.ExtensionName,
		polling.ExtensionName,
		store.ExtensionName,
		messaging.ExtensionName,
		alftask.ExtensionName,
		notebook.ExtensionName,
	} {
		if !hasSmokeSpec(name) {
			t.Fatalf("requested extension %s has no Go smoke spec", name)
		}
	}
}

func canonicalSchemasFor(t *testing.T, names []string) []appsdk.FunctionSchema {
	t.Helper()

	schemas := make([]appsdk.FunctionSchema, 0, len(names))
	for _, name := range names {
		schema, ok := schemaregistry.Schema(name)
		if !ok {
			t.Fatalf("missing canonical schema for %s", name)
		}
		schemas = append(schemas, schema)
	}
	return schemas
}

func hasSmokeSpec(name string) bool {
	for _, spec := range extensionSmokeSpecs {
		if spec.name == name {
			return true
		}
	}
	return false
}

func smokeZero[TIn any, TOut any]() appsdk.TypedHandlerFunc[TIn, TOut] {
	return func(context.Context, appsdk.Context, *TIn) (*TOut, error) {
		return new(TOut), nil
	}
}
