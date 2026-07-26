# Build Your First Channel App

Follow this page from creating a development private app through running the `/tutorial` Command,
React WAM, and bot/manager message flows. Choose either TypeScript or Go for the server. Both paths
use the official SDK and public tutorial repository instead of implementing token issuance,
Extension registration, signature verification, or the WAM bridge by hand.

When finished, you will verify that:

- the SDK automatically registers the `command` Extension and Function schemas;
- `/tutorial` opens a WAM inside a Channel client;
- the WAM can send a test message as the app bot or current manager;
- invalid signatures and missing permissions fail explicitly.

## 1. Prerequisites

Both paths require:

- an account that can access the Channel developer portal;
- a stable public HTTPS address or tunnel for the local server;
- Git.

The TypeScript path requires Node.js 20.11 or newer and Corepack. The Go path requires Go 1.25 plus
Node.js and Corepack for the WAM build.

Open App Store from Channel settings and start the app creation flow. The layout may change, but
the meanings of App Store, Create App, Auth and Access, Permissions, and Server Settings remain the
same.

![Open App Store from Channel settings](../../assets/first-app/app-store-entry.png)

Enter a development name, accept the terms, and create a private app.

![Create a development app](../../assets/first-app/create-app.png)

## 2. Configure credentials and permissions

Find the App ID in General settings. The App ID is public identity; the App Secret and Signing Key
are server secrets.

![Find the App ID](../../assets/first-app/app-id.png)

Issue the App Secret under Auth and Access and the Signing Key under Server Settings. These values
may be shown only once. Store them in a secret manager and never put them in Git, documentation,
WAM code, or logs.

![Issue the App Secret](../../assets/first-app/app-secret.png)

Enable only the permissions required by the tutorial:

- Channel: `writeGroupMessage`
- Manager: `writeGroupMessageAsManager`

![Configure tutorial permissions](../../assets/first-app/permissions.png)

This app uses four separate trust boundaries:

- incoming Functions: verify `x-signature` with the Signing Key;
- server-to-AppStore calls: the SDK `TokenManager` owns app/channel tokens;
- manager actions in a WAM: the Channel host authorizes the current manager;
- external providers: OAuth uses `ctx.authToken`; API keys and `client_credentials` use Config.

Read [Concepts](concepts.md#authentication-and-tokens) for the detailed boundaries.

## 3. Choose a server language and clone the tutorial

Follow one path only.

### TypeScript

```bash
git clone https://github.com/channel-io/app-tutorial-ts.git
cd app-tutorial-ts
corepack enable
cp server/.env.example server/.env
```

Fill `server/.env`:

```dotenv
APP_ID=your-app-id
APP_SECRET=your-app-secret
SIGNING_KEY=your-hex-signing-key
```

### Go

```bash
git clone https://github.com/channel-io/app-tutorial.git
cd app-tutorial
corepack enable
cp .env.example .env
```

Fill `APP_ID`, `APP_SECRET`, and `SIGNING_KEY` in `.env`, then load it into the current shell:

```bash
set -a
. ./.env
set +a
```

The repository lockfile and Go module pin verified SDK versions. Do not replace them with arbitrary
versions during the first run.

## 4. Prepare HTTPS endpoints

Prepare a stable HTTPS tunnel before starting the server.

| Path       | Local port |
| ---------- | ---------- |
| TypeScript | `3000`     |
| Go         | `3022`     |

You may use any HTTPS tunnel tool, such as [ngrok](https://ngrok.com/). After installing and
authenticating ngrok, expose the local port for the tutorial you selected:

```bash
# TypeScript tutorial
ngrok http 3000

# Go tutorial
ngrok http 3022
```

Use the `Forwarding` HTTPS origin shown by ngrok as `YOUR_HOST`. If the tunnel address changes,
update the endpoints in the developer portal and restart the server.

If the public address is `https://YOUR_HOST`, save these roots in Server Settings:

| Setting           | Value                            |
| ----------------- | -------------------------------- |
| Function Endpoint | `https://YOUR_HOST/functions`    |
| WAM Endpoint      | `https://YOUR_HOST/resource/wam` |

![Configure Function and WAM endpoints](../../assets/first-app/endpoints.png)

Do not append `/v1` to the Function Endpoint or `/tutorial` to the WAM Endpoint. The SDK and
AppStore add the system version and WAM name. Restart the server after changing credentials,
permissions, or endpoints so startup auto-registration runs again.

## 5. Install dependencies, build, and test

### TypeScript

```bash
corepack pnpm install --frozen-lockfile
corepack pnpm build
corepack pnpm test
corepack pnpm typecheck
```

### Go

```bash
make build
make test
```

Every command must pass. Do not continue after a failed install or by disabling signature
verification.

## 6. Run the server

### TypeScript

```bash
corepack pnpm start
```

### Go

```bash
make run
```

Confirm listener startup and successful Extension registration in the server logs. The SDK caches
an app token, calls `registerExtension(appId, extensionName, systemVersion)` with a camelCase
payload, and answers `extension.core.function.getFunctions` discovery.

The tutorials expose:

| Path              | TypeScript                                    | Go                                            |
| ----------------- | --------------------------------------------- | --------------------------------------------- |
| Function Endpoint | `https://YOUR_HOST/functions`                 | `https://YOUR_HOST/functions`                 |
| WAM Endpoint      | `https://YOUR_HOST/resource/wam`              | `https://YOUR_HOST/resource/wam`              |
| Local WAM         | `http://localhost:3000/resource/wam/tutorial` | `http://localhost:3022/resource/wam/tutorial` |
| Health check      | server listener                               | `http://localhost:3022/ping`                  |

## 7. Run the app in a test Channel

Install the private app in a test Channel, or refresh an existing installation. Run `/tutorial` in
a Channel group conversation. If the Command is absent, check Extension registration and Function
discovery in the server logs first.

When the WAM opens, invoke both the app-bot and manager actions.

![Tutorial WAM open inside the Channel client](../../assets/first-app/tutorial-wam.png)

Both test messages should arrive.

![Test messages sent by the bot and manager](../../assets/first-app/tutorial-result.png)

Also verify these failure paths:

- a non-group-chat surface renders an unsupported state;
- removing the Manager permission makes the manager action fail explicitly;
- a missing `x-signature` or wrong Signing Key is rejected;
- duplicate submission is disabled while a request is in flight.

## 8. Understand what just ran

- **Extension**: `command:v1` publishes `/tutorial` metadata.
- **Function**: `tutorial.open` and `tutorial.sendAsBot` are typed server operations.
- **WAM**: the React UI is served from `/resource/wam/tutorial`.
- **App Function call**: `useCallFunction` routes through AppStore to the app server.
- **Native Function call**: `useNativeFunction` acts with the current manager's authorization.
- **Token**: only the server-side `TokenManager` manages app/channel tokens.

See each tutorial README's project map for the TypeScript and Go source locations.

## 9. Troubleshooting

| Symptom                       | Check                                                                      |
| ----------------------------- | -------------------------------------------------------------------------- |
| Extension registration fails  | App ID/Secret, app token, public AppStore URL, server restart              |
| `401` or signature failure    | hex Signing Key, raw-body preservation, `x-signature` verification         |
| `/functions/v1` returns `404` | portal uses `/functions` root and ingress reaches the same SDK handler     |
| WAM does not open             | WAM Endpoint is `/resource/wam` root and the WAM build passed              |
| Manager action fails          | `writeGroupMessageAsManager`, group surface, current manager authorization |
| Bot action fails              | `writeGroupMessage`, installed Channel, channel-token cache                |

Use `SKIP_SIGNATURE_VERIFICATION=true` only in isolated local debugging. Never paste the App
Secret, Signing Key, access/refresh tokens, or provider credentials into an issue or log.

## Continue in this order

1. Complete this first-app Quickstart.
2. Learn the Function, Extension, WAM, authentication, and token boundaries in [Concepts](concepts.md).
3. Read the wire contract and define standalone typed app Functions with [Function registration](functions.md).
4. Implement metadata, actions, and autocomplete with the [Command guide](extensions/command.md).
5. Build the React UI, host authorization, and Function calls with the [WAM guide](wam.md).
6. Design, secure, deploy, and operate the app with the [complete app development guide](app-development.md).
7. Choose a capability and follow its recipe in the [Extension guide](extensions.md).
8. Use the [TypeScript reference map](../../reference/typescript/README.md) or
   [Go reference](../../reference/go/README.md) for language-specific APIs.
9. Keep the [TypeScript tutorial](https://github.com/channel-io/app-tutorial-ts) or
   [Go tutorial](https://github.com/channel-io/app-tutorial) open as a complete implementation.
