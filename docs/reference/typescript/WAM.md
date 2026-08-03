# WAM (Web App Module)

WAM is the frontend runtime for Channel app UI.
In practice, WAM is how command actions, widgets, and custom tabs render interactive experiences.

A WAM is not an app server and does not own server credentials. The Channel host injects runtime data and exposes a bridge for app/native Function calls.

## Install

```bash
npm install @channel.io/app-sdk-wam
```

## When To Use WAM

Use WAM when a server-side extension action should open UI instead of returning plain text.

Common entry points:

- command action returns `{ type: "wam", attributes: ... }`
- widget action returns `{ type: "wam", attributes: ... }`
- custom tab action returns `{ type: "wam", attributes: ... }`

For example:

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

## Versioned Render Snapshots

App Functions that create a durable WAM clip should return a versioned render
snapshot. The renderer version and snapshot schema version are intentionally
separate: the latest WAM implementation can keep reading older saved data.

```ts
import type { WamResult } from "@channel.io/app-sdk-core";

const result: WamResult = {
  type: "wam",
  attributes: {
    name: "trend-report",
    wamVersion: 1,
    renderSnapshot: {
      schemaVersion: 1,
      capturedAt: new Date().toISOString(),
      data: { summary: { title: "This week's trend" } },
    },
    sharePolicy: { public: "interactiveSnapshot" },
  },
};
```

Use `useRenderSnapshot()` inside the WAM. It also reads legacy CoS clips that
only contain `publicSnapshot` as renderer/schema version 1. A render snapshot
must be a JSON object and must never contain credentials or private data when
the public share policy is enabled.

Register the WAM Endpoint root and serve the built SPA from `${WAM_ENDPOINT}/${name}`. `wamArgs` and injected runtime data are client-readable; never use them to transport a secret or token.

## Minimal Setup

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

## Core Hooks

### `useWamData()`

Read values injected by the Channel runtime.
The most common keys are:

- `appId`
- `channelId`
- `managerId`
- `chatId`
- `chatType`
- `rootMessageId`
- custom keys passed in `wamArgs`

### `useCallFunction()`

Call your own app function.
This is the main way a WAM UI talks back to your server extension logic.
Use it for business logic and for work that must execute as the app or bot. The app server can obtain a channel token without exposing it to the WAM.

```tsx
const appId = useWamData("appId") as string;
const { call, loading, error } = useCallFunction({
  appId,
  name: "calendar.booking.createBooking",
});
```

### `useNativeFunction()`

Call a Channel native function that is exposed to the current role and surface.
This is useful for manager-scoped OAuth or API key management flows, and for other runtime-native integrations.
Authorization comes from the current Channel surface and manager/user role. The WAM does not receive or mint that token.

```tsx
const { call } = useNativeFunction({
  name: "getOAuthAuthorizationURL",
});
```

### `useWamSize()`

Resize the current WAM window or panel.
Use it on mount and when content size changes.

### `useWamClose()`

Close the current WAM surface.

## Common Pattern

The usual WAM loop looks like this:

1. Read runtime context from `useWamData()`
2. Call app functions with `useCallFunction()`
3. Call native functions only when the flow really needs Channel-owned capabilities
4. Resize with `useWamSize()` when content changes

## Which Extensions Usually Open WAM

- Command
- Widget
- Custom tab
- Some OAuth or API key setup flows

Calendar is a good concrete example because it combines:

- server-side extension functions
- a WAM booking UI
- command/widget/custom-tab style action results if you choose to wrap it that way

## Best Practices

- Prefer `useCallFunction()` for your own business logic
- Treat `useNativeFunction()` as the boundary to Channel-owned capabilities
- Pass only the minimum needed `wamArgs`
- Never put App Secret, Signing Key, app/channel token, provider token, or config credentials in WAM code or data
- Validate authorization again in server Functions; client UI visibility is not an authorization boundary
- Set an initial size early
- Keep action handlers small and push real logic into app functions

For the complete credential model, read [Authentication and Tokens](AUTH-AND-TOKENS.md). For a runnable implementation, see the [TypeScript tutorial](https://github.com/channel-io/app-tutorial-ts).
