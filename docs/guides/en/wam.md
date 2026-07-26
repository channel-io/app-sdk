# WAM Guide

A WAM (Web App Module) is a React web UI opened inside a Channel client. It is not an app server
and does not store server credentials. Use it for Extension actions that need user interaction,
such as commands, widgets, and custom tabs.

## Open a WAM from an action

The Channel client opens a WAM when a Function returns an action result like this:

```json
{
  "type": "wam",
  "attributes": {
    "appId": "public-app-id",
    "name": "tutorial",
    "wamArgs": { "view": "summary" }
  }
}
```

`appId` is public and `name` selects the WAM route. Browser code can read `wamArgs`, so never put
secrets, tokens, provider credentials, or raw customer content in it.

## Endpoint and React setup

Register the WAM root in the developer portal and serve the built SPA from
`${WAM_ENDPOINT}/${name}`.

```text
WAM Endpoint: https://app.example.com/resource/wam
Loaded WAM:   https://app.example.com/resource/wam/tutorial
```

Wrap the React root with `WamProvider`.

```tsx
import React from "react";
import ReactDOM from "react-dom/client";
import { WamProvider } from "@channel.io/app-sdk-wam";
import App from "./App";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <WamProvider>
      <App />
    </WamProvider>
  </React.StrictMode>,
);
```

Go apps use the same TypeScript/React WAM package. The Go server returns the WAM action and exposes
Functions while mounting the static SPA route separately.

## Runtime data and trust boundary

Read host-injected values with `useWamData` or `useTypedWamData`. Depending on the surface, values
may include `appId`, `channelId`, `managerId`, `chatId`, `chatType`, `rootMessageId`, and `wamArgs`.
Do not assume optional values exist; validate them with a schema.

A WAM uses manager/user authorization managed by the Channel host. Never pass the App Secret,
Signing Key, app token, or channel token through the WAM bundle or runtime data.

## Call app and Native Functions

Use `useCallFunction` for app business logic and work performed as the app or bot. The server can
obtain a channel token through `TokenManager` and perform the required operation.

```tsx
const appId = useWamData("appId") as string;
const { call, loading, error } = useCallFunction({
  appId,
  name: "orders.get",
});

const order = await call({ orderId: "order-1" });
```

Use `useNativeFunction` only for a Channel operation explicitly performed by the current manager
or user. The host authorizes it from the current Channel surface and role; the server's
`TokenManager` cannot mint that authorization.

```tsx
const { call } = useNativeFunction({ name: "writeGroupMessageAsManager" });
await call({ channelId, groupId, dto: { plainText: "Hello" } });
```

Use only Native Function names and input types exported by the SDK, and enable the required
permissions.

## Resize and close

Use `useWamSize` for the initial size and content-driven resizing, and `useWamClose` to close the
surface.

```tsx
const { setSize } = useWamSize();
const { close } = useWamClose();

useEffect(() => setSize({ width: 480, height: 320 }), [setSize]);
```

If closing should follow another action, await `useCallFunction` or `useNativeFunction` first and
then call `close()`. Do not close the WAM before the user can see a failed action.

## Test checklist

- Open the WAM from an installed private app and verify that the host bridge is available.
- Handle a browser opened directly at the WAM URL, where no host bridge exists.
- Test missing optional context, invalid `wamArgs`, and Function errors.
- Test manager/user permission denial separately from the server-side channel-token flow.
- Verify initial size, dynamic resizing, and normal close behavior.
- Check bundles, source maps, logs, and `wamArgs` for credentials.

Read the [Command guide](extensions/command.md) for opening a WAM from a command, the
[Extension guide](extensions.md) for registration, and the
[production readiness guide](app-development.md) before launch. Use the
[TypeScript WAM reference](../../reference/typescript/WAM.md) for exact hook APIs and the
[Go WAM reference](../../reference/go/WAM.md) for server integration.
