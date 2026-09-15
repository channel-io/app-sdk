package extension_test

import (
	"context"
	"fmt"

	"github.com/channel-io/app-sdk/go/appsdk"
	"github.com/channel-io/app-sdk/go/extension/alftask"
	"github.com/channel-io/app-sdk/go/extension/calendar"
	"github.com/channel-io/app-sdk/go/extension/command"
	"github.com/channel-io/app-sdk/go/extension/config"
	"github.com/channel-io/app-sdk/go/extension/customtab"
	"github.com/channel-io/app-sdk/go/extension/hook"
	"github.com/channel-io/app-sdk/go/extension/messaging"
	"github.com/channel-io/app-sdk/go/extension/oauth"
	"github.com/channel-io/app-sdk/go/extension/polling"
	"github.com/channel-io/app-sdk/go/extension/store"
	"github.com/channel-io/app-sdk/go/extension/suggestion"
	"github.com/channel-io/app-sdk/go/extension/widget"
)

func Example_extensionBuilders() {
	app := appsdk.New(appsdk.Options{AppID: "app"})

	_ = app.Use(config.Extension().
		GetConfigSchema(exampleZero[config.GetConfigSchemaRequest, config.GetConfigSchemaResponse]()))
	_ = app.Use(oauth.Extension().
		GetAuthConfig(exampleZero[oauth.GetAuthConfigRequest, oauth.AuthConfig]()))
	_ = app.Use(calendar.Extension().
		ListCalendars(exampleZero[calendar.ListCalendarsRequest, calendar.ListCalendarsResponse]()))
	_ = app.Use(command.Extension().
		GetCommands(exampleZero[command.GetCommandsRequest, command.GetCommandsResponse]()))
	_ = app.Use(widget.Extension().
		GetWidgets(exampleZero[widget.GetWidgetsRequest, widget.GetWidgetsResponse]()))
	_ = app.Use(customtab.Extension().
		GetCustomTabs(exampleZero[customtab.GetCustomTabsRequest, customtab.GetCustomTabsResponse]()))
	_ = app.Use(hook.Extension().
		GetHooks(exampleZero[hook.GetHooksRequest, hook.GetHooksResponse]()))
	_ = app.Use(polling.Extension().
		GetPollers(exampleZero[polling.GetPollersRequest, polling.GetPollersResponse]()))
	_ = app.Use(store.Extension().
		GetStoreProfile(exampleZero[store.GetStoreProfileRequest, store.GetStoreProfileResponse]()))
	_ = app.Use(suggestion.Extension().
		GetTriggers(exampleZero[suggestion.GetTriggersRequest, suggestion.GetTriggersResponse]()))
	_ = app.Use(messaging.Extension().
		InboxGetWritingTypes(exampleZero[messaging.InboxGetWritingTypesInput, messaging.InboxGetWritingTypesOutput]()))
	_ = app.Use(alftask.Extension().
		GetTasks(exampleZero[alftask.GetTasksRequest, alftask.GetTasksResponse]()))

	fmt.Println(len(app.AutoRegisterTargets()))
	fmt.Println(len(app.Schemas()))
	// Output:
	// 12
	// 12
}

func exampleZero[TIn any, TOut any]() appsdk.TypedHandlerFunc[TIn, TOut] {
	return func(context.Context, appsdk.Context, *TIn) (*TOut, error) {
		return new(TOut), nil
	}
}
