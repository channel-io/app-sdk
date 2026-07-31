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
)

func TestRegisteredExtensionSchemasMatchCanonicalRegistry(t *testing.T) {
	app := appsdk.New(appsdk.Options{AppID: "app"})

	use(t, app, alftask.Extension().
		GetTasks(zero[alftask.GetTasksRequest, alftask.GetTasksResponse]()))

	use(t, app, apikey.Extension().
		GetAuthConfig(zero[apikey.GetAuthConfigRequest, apikey.AuthConfig]()).
		ValidateCredentials(zero[apikey.ValidateCredentialsRequest, apikey.ValidateCredentialsResponse]()))

	use(t, app, calendar.Extension().
		CancelBooking(zero[calendar.CancelBookingRequest, calendar.CancelBookingResponse]()).
		CreateBooking(zero[calendar.CreateBookingRequest, calendar.Booking]()).
		GetBooking(zero[calendar.GetBookingRequest, calendar.Booking]()).
		GetAvailability(zero[calendar.GetAvailabilityRequest, calendar.GetAvailabilityResponse]()).
		ListCalendars(zero[calendar.ListCalendarsRequest, calendar.ListCalendarsResponse]()).
		ListEventTypes(zero[calendar.ListEventTypesRequest, calendar.ListEventTypesResponse]()))

	use(t, app, command.Extension().
		Execute(command.FunctionExecute, zero[command.ExecuteRequest, command.ActionResult]()).
		Suggestions(command.FunctionGetSuggestions, zero[command.GetSuggestionsRequest, command.GetSuggestionsResponse]()).
		GetCommands(zero[command.GetCommandsRequest, command.GetCommandsResponse]()))

	use(t, app, commerce.Extension().
		GetAppConfigs(zero[commerce.GetAppConfigsInput, commerce.GetAppConfigsOutput]()).
		AcceptReturnOrder(zero[commerce.AcceptReturnOrderInput, commerce.ActionResult]()).
		ChangeShippingAddress(zero[commerce.ChangeShippingAddressInput, commerce.ActionResult]()).
		GetExchangeableItems(zero[commerce.GetExchangeableItemsInput, commerce.GetExchangeableItemsOutput]()).
		GetOrders(zero[commerce.GetOrdersInput, commerce.GetOrdersOutput]()).
		RequestCancelOrder(zero[commerce.CancelOrderInput, commerce.ActionResult]()).
		RequestExchangeOrder(zero[commerce.ExchangeOrderInput, commerce.ActionResult]()).
		RequestReturnOrder(zero[commerce.ReturnOrderInput, commerce.ActionResult]()))

	use(t, app, config.Extension().
		GetConfigSchema(zero[config.GetConfigSchemaRequest, config.GetConfigSchemaResponse]()).
		ValidateStoredConfig(zero[config.ValidateStoredConfigRequest, config.ValidateStoredConfigResponse]()))

	use(t, app, customtab.Extension().
		Action(customtab.FunctionAction, zero[customtab.ActionRequest, customtab.ActionResult]()).
		GetCustomTabs(zero[customtab.GetCustomTabsRequest, customtab.GetCustomTabsResponse]()))

	use(t, app, datasource.Extension().
		DescribeTable(zero[datasource.DescribeTableInput, datasource.DescribeTableOutput]()).
		ListCatalogs(zero[datasource.ListCatalogsInput, datasource.ListCatalogsOutput]()).
		ListTables(zero[datasource.ListTablesInput, datasource.ListTablesOutput]()).
		AuthorizeQuery(zero[datasource.AuthorizeQueryInput, datasource.AuthorizeQueryOutput]()))

	use(t, app, hook.Extension().
		GetHooks(zero[hook.GetHooksRequest, hook.GetHooksResponse]()))

	use(t, app, mailrelay.Extension().
		OnMailReceived(zero[mailrelay.InboundInput, mailrelay.InboundOutput]()))

	use(t, app, messaging.Extension().
		InboxGetCustomEditorWAM(zero[messaging.InboxGetCustomEditorWAMInput, messaging.WAMResult]()).
		InboxGetMediumMessageErrorReason(zero[messaging.InboxGetMediumMessageErrorReasonInput, messaging.InboxGetMediumMessageErrorReasonOutput]()).
		InboxGetMediumTopicSelectorWAM(zero[messaging.InboxGetMediumTopicSelectorWAMInput, messaging.WAMResult]()).
		InboxGetWritingTypes(zero[messaging.InboxGetWritingTypesInput, messaging.InboxGetWritingTypesOutput]()).
		InboxOnMediumMessageCreated(zero[messaging.OnMediumMessageCreatedInput, messaging.OnMediumMessageCreatedOutput]()).
		InboxOnMediumUserChatClosed(zero[messaging.InboxOnMediumUserChatClosedInput, messaging.InboxOnMediumUserChatClosedOutput]()).
		PrebuiltBuildMediumTopics(zero[messaging.PrebuiltBuildMediumTopicsInput, messaging.PrebuiltBuildMediumTopicsOutput]()).
		PrebuiltGetCustomEditorWAM(zero[messaging.PrebuiltGetCustomEditorWAMInput, messaging.WAMResult]()).
		PrebuiltGetDefaultOptions(zero[messaging.PrebuiltGetDefaultOptionsInput, messaging.PrebuiltGetDefaultOptionsOutput]()).
		PrebuiltGetMediumTopicBuilderSelectorWAM(zero[messaging.PrebuiltGetMediumTopicBuilderSelectorWAMInput, messaging.WAMResult]()).
		PrebuiltGetWritingTypes(zero[messaging.PrebuiltGetWritingTypesInput, messaging.PrebuiltGetWritingTypesOutput]()).
		PrebuiltValidateEntity(zero[messaging.PrebuiltValidateEntityInput, messaging.PrebuiltValidateEntityOutput]()))

	use(t, app, notebook.Extension().
		GetNotebooks(zero[notebook.GetNotebooksRequest, notebook.GetNotebooksResponse]()))

	use(t, app, oauth.Extension().
		GetAuthConfig(zero[oauth.GetAuthConfigRequest, oauth.AuthConfig]()).
		ValidateCredentials(zero[oauth.CredentialValidationInput, oauth.CredentialValidationResult]()))

	use(t, app, order.Extension().
		CancelOrder(zero[order.CancelOrderInput, order.SuccessOutput]()).
		GetAppConfigs(zero[order.GetAppConfigsInput, order.GetAppConfigsOutput]()).
		GetOrders(zero[order.GetOrdersInput, order.GetOrdersOutput]()).
		ChangeShippingAddress(zero[order.ChangeShippingAddressInput, order.SuccessOutput]()).
		ExchangeOrder(zero[order.ExchangeOrderInput, order.SuccessOutput]()).
		GetExchangeableItems(zero[order.GetExchangeableItemsInput, order.GetExchangeableItemsOutput]()).
		ReturnOrder(zero[order.ReturnOrderInput, order.SuccessOutput]()))

	use(t, app, polling.Extension().
		GetPollers(zero[polling.GetPollersRequest, polling.GetPollersResponse]()).
		GetChannels(zero[polling.GetChannelsRequest, polling.GetChannelsResponse]()).
		GetManagers(zero[polling.GetManagersRequest, polling.GetManagersResponse]()))

	use(t, app, store.Extension().
		GetStoreProfile(zero[store.GetStoreProfileRequest, store.GetStoreProfileResponse]()))

	use(t, app, widget.Extension().
		GetWidgets(zero[widget.GetWidgetsRequest, widget.GetWidgetsResponse]()).
		Action(widget.FunctionAction, zero[widget.ActionRequest, widget.ActionResult]()))

	use(t, app, wms.Extension().
		CancelOrder(zero[wms.CancelOrderRequest, wms.SuccessResponse]()).
		RestoreCanceledOrder(zero[wms.RestoreOrderRequest, wms.SuccessResponse]()).
		GetAppConfigs(zero[wms.GetAppConfigsRequest, wms.GetAppConfigsResponse]()).
		GetOrder(zero[wms.GetOrderRequest, wms.GetOrderResponse]()).
		GetOrders(zero[wms.GetOrdersRequest, wms.GetOrdersResponse]()).
		GetShopID(zero[wms.GetShopIDRequest, wms.GetShopIDResponse]()).
		ChangeShippingAddress(zero[wms.ChangeShippingAddressRequest, wms.SuccessResponse]()).
		ExchangeOrder(zero[wms.ExchangeOrderRequest, wms.SuccessResponse]()).
		RestoreExchangedOrder(zero[wms.RestoreOrderRequest, wms.SuccessResponse]()).
		GetSupportedCommerces(zero[wms.GetSupportedCommercesRequest, wms.GetSupportedCommercesResponse]()).
		OrderChangeShippingAddress(zero[wms.OrderChangeShippingAddressRequest, wms.OrderActionResponse]()).
		OrderGetOrders(zero[wms.OrderGetOrdersRequest, wms.OrderGetOrdersResponse]()).
		OrderRequestCancelOrder(zero[wms.OrderActionRequest, wms.OrderActionResponse]()).
		OrderRequestExchangeOrder(zero[wms.OrderActionRequest, wms.OrderActionResponse]()).
		OrderRequestReturnOrder(zero[wms.OrderActionRequest, wms.OrderActionResponse]()).
		OrderRestoreCanceledOrder(zero[wms.OrderActionRequest, wms.OrderActionResponse]()).
		OrderRestoreExchangedOrder(zero[wms.OrderActionRequest, wms.OrderActionResponse]()).
		OrderRestoreReturnedOrder(zero[wms.OrderActionRequest, wms.OrderActionResponse]()).
		RestoreReturnedOrder(zero[wms.RestoreOrderRequest, wms.SuccessResponse]()).
		ReturnOrder(zero[wms.ReturnOrderRequest, wms.SuccessResponse]()))

	got := app.Schemas()
	want := schemaregistry.Schemas()

	if len(got) != 78 {
		t.Fatalf("expected 78 registered extension function schemas, got %d", len(got))
	}
	if !reflect.DeepEqual(got, want) {
		t.Fatalf("registered extension function schemas drifted from canonical registry")
	}
}

func use(t *testing.T, app *appsdk.App, extension appsdk.Extension) {
	t.Helper()
	if err := app.Use(extension); err != nil {
		t.Fatal(err)
	}
}

func zero[TIn any, TOut any]() appsdk.TypedHandlerFunc[TIn, TOut] {
	return func(context.Context, appsdk.Context, *TIn) (*TOut, error) {
		return new(TOut), nil
	}
}
