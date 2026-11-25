# Build your first Channel app

Build a sample order management system with the [Channel App SDK](https://github.com/channel-io/app-sdk) and connect it to Channel Talk. Channel Talk calls your app server over HTTP, and the app code runs on the server you host. The **App Store** in channel settings is where people install apps. Behind that screen, App Store tracks installs, registers Extensions, and relays function calls.

```text
Channel Talk → App Store → app server   Call an app function
App server → App Store → Channel Talk   Call a Native Function
Channel Talk client → WAM Endpoint      Load a web screen
```

- An **app function** is an operation your server provides, such as looking up an order. You can run it in **Developer tools** and reuse it from a Command, ALF, or CoS.
- An **Extension** defines a contract for a Channel Talk capability such as a Command, including the functions and metadata it expects.
- A **WAM (Web App Module)** is your app’s web screen inside Channel Talk. The Channel Talk client loads it directly from your WAM Endpoint.
- A **Native Function** is an operation Channel Talk provides for your app to call, such as sending a notification.

Check the connection with `ping` and add an order lookup. Then open a WAM with `/cancel-order`, cancel an order, and notify the manager through a Native Function. Finally, use the lookup in CoS and ALF. [App concepts](concepts.md)

## Requirements

- Install the latest **Node.js 24 LTS** patch release. [Download Node.js](https://nodejs.org/en/download)
- Install **pnpm 10.26 or later in the 10.x series** to manage dependencies and build the server and WAM packages. [Install pnpm](https://pnpm.io/installation)
- Use a **code editor and terminal**. Keep the server running in one terminal and enter tutorial commands in another.
- Set up the **ngrok CLI and an account**. Use it to give the local server an HTTPS address that App Store can reach. [Install and configure ngrok](https://ngrok.com/docs/getting-started/)
- Prepare a **test channel** where you can install apps, and sign in to [Channel Developer Portal](https://channel.works/-/developers/apps).

Familiarity with HTTP requests and responses and TypeScript modules will help. The examples use [NestJS decorators and dependency injection](https://docs.nestjs.com/providers) to register functions and pass services from `providers` to constructors. [Zod](https://zod.dev/) describes function inputs and outputs, and [Vite](https://vite.dev/) builds the [React](https://react.dev/) screen.

## 1. Create your first app

Create an app in Channel Developer Portal and save its keys in `server/.env`. Use the Channel App SDK to implement `ping` and start a [NestJS](https://nestjs.com/) server, then call the Function in Developer tools to check the connection.

### Create an app in Channel Developer Portal

Open [Channel Developer Portal](https://channel.works/-/developers/apps) and select **Create app** in **My apps**. Enter **주문 관리 시스템** as the app name, choose **Legacy token**, accept the terms, and confirm to create a private app.

### Save the app ID and keys

After creating the app, run these commands to create and enter the tutorial directory.

```sh
mkdir order-management
cd order-management
mkdir -p server/src
touch server/.env
```

Open `server/.env` and add the three entries as shown below. If you use Git, add `.env` to `.gitignore` before filling in the values. The portal displays the Secret and Signing Key once, when it issues them. Save each value to `server/.env` before closing its screen.

```dotenv
APP_ID=
APP_SECRET=
SIGNING_KEY=
```

Copy the **Application ID** beneath the app name into `APP_ID`. App Store uses it to identify the app.

In **Authentication and Permissions**, issue the **Secret** and paste it into `APP_SECRET`. The SDK uses it to obtain an app token from App Store.

In **Server settings** under **Server and Integrations**, issue the **Signing Key** and paste it into `SIGNING_KEY`. The server uses it to verify requests from App Store.

| Value         | Purpose                                                                    |
| ------------- | -------------------------------------------------------------------------- |
| App ID        | Public identifier for the app                                              |
| App Secret    | Secret the SDK uses to obtain app and channel tokens                       |
| Signing Key   | Key your server uses to verify signatures on App Store requests            |
| App token     | Authorizes app-level operations such as Extension registration             |
| Channel token | Authorizes Native Function calls in the channel where the app is installed |

**Why the Signing Key matters.** A third party could impersonate App Store if your server skips signature verification. App Store computes an HMAC-SHA256 signature from the Signing Key and the request body, encodes it in Base64, and sends it in `x-signature`. The SDK's `SignatureGuard` recalculates the signature using the original request bytes. **Only requests with a matching signature should reach the function.**

### Set up the project

Create `pnpm-workspace.yaml` in the project root and add the `server` package as shown below.

```yaml
packages:
  - server

allowBuilds:
  protobufjs: false
```

`allowBuilds` controls which dependencies can run scripts during installation. Setting `protobufjs: false` skips the install script for this server SDK dependency.

Create `server/package.json` as shown below with the scripts to build and start the server.

```json
{
  "name": "order-server",
  "private": true,
  "type": "module",
  "scripts": {
    "build": "tsc",
    "start": "node --env-file=.env dist/index.js"
  }
}
```

From the project root, run these commands to install the server dependencies. The `@channel.io/app-sdk-server` package runs on NestJS. This exercise uses `@nestjs/platform-express` as its HTTP adapter.

```sh
pnpm --dir server add @channel.io/app-sdk-server@0.46.0 @nestjs/common@11 @nestjs/core@11 @nestjs/platform-express@11 reflect-metadata zod@^4.6.7
pnpm --dir server add -D typescript@5 @types/node@24
```

Create `server/tsconfig.json` as shown below. Write the server code in `server/src`. TypeScript compiles it to JavaScript in `server/dist`.

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "NodeNext",
    "rootDir": "src",
    "outDir": "dist",
    "strict": true,
    "experimentalDecorators": true,
    "emitDecoratorMetadata": true,
    "skipLibCheck": true
  },
  "include": ["src"]
}
```

### Create the ping Function

Create `server/src/ping.function.ts` with the code below. `ping` takes no input and returns `pong` in `message`. `@Func` declares the Function name. `@InputSchema` and `@OutputSchema` define its input and output. Use `description` to say when to call the function and what it returns. ALF and CoS use that description to choose a tool and the input schema to construct its arguments.

```ts
import { Injectable } from "@nestjs/common";
import {
  type Context,
  Ctx,
  Func,
  Input,
  InputSchema,
  OutputSchema,
} from "@channel.io/app-sdk-server";
import { z } from "zod";

const PingInputSchema = z.object({});
type PingInput = z.infer<typeof PingInputSchema>;
const PingOutputSchema = z.object({ message: z.literal("pong") });

@Injectable()
export class PingFunctions {
  @Func({ name: "ping", description: "Check that the app server responds." })
  @InputSchema(PingInputSchema)
  @OutputSchema(PingOutputSchema)
  ping(@Ctx() ctx: Context, @Input() input: PingInput) {
    console.log("ping function call", { ctx, input });
    return { message: "pong" };
  }
}
```

Create `server/src/index.ts` with the code below. This file configures the SDK module and registers `PingFunctions` in `providers`. Set the application type to `NestExpressApplication` to use methods from the Express adapter.

With TypeScript’s `NodeNext` setting, imports use the filename that Node.js loads at runtime. Import `./ping.function.js`, which is what TypeScript emits from `ping.function.ts`.

```ts
import "reflect-metadata";
import { Module } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import type { NestExpressApplication } from "@nestjs/platform-express";
import {
  CHANNEL_APP_OPTIONS,
  ChannelAppModule,
  SignatureGuard,
} from "@channel.io/app-sdk-server";
import { PingFunctions } from "./ping.function.js";

@Module({
  imports: [
    ChannelAppModule.forRoot({
      appId: process.env["APP_ID"] ?? "",
      appSecret: process.env["APP_SECRET"] ?? "",
      signingKey: process.env["SIGNING_KEY"] ?? "",
      autoRegister: true,
    }),
  ],
  providers: [PingFunctions],
})
class AppModule {}

const app = await NestFactory.create<NestExpressApplication>(AppModule, {
  rawBody: true,
});
app.useGlobalGuards(new SignatureGuard(app.get(CHANNEL_APP_OPTIONS)));
await app.listen(3000);
```

App Store sends Function requests to `PUT /functions/v1`. NestJS preserves the original request body with `rawBody: true`. The SDK's `SignatureGuard` uses that body and the Signing Key to verify the signature in `x-signature`.

For a versioned `ping` call, App Store sends a request like this to `PUT /functions/v1`. The `systemVersion` field in the body is optional.

```json
{
  "method": "ping",
  "params": {},
  "context": {
    "caller": { "type": "manager", "id": "example-manager-id" },
    "channel": { "id": "example-channel-id" }
  },
  "systemVersion": "v1"
}
```

The SDK matches `method` to a registered `@Func`, passes `params` to `@Input()`, and passes `context` to `@Ctx()`. This request returns `{"result":{"message":"pong"}}`. A `FunctionCallError` from the function produces an `error` in the response body.

### Expose the server with ngrok

Give App Store an HTTPS address for your local server. Run the first command if you still need to configure your ngrok auth token. Run `ngrok http 3000` in another terminal and leave it running.

```sh
ngrok config add-authtoken YOUR_NGROK_AUTHTOKEN
ngrok http 3000
```

If the HTTPS address changes when you restart ngrok, update the Function Endpoint in the Developer Portal. After you add a WAM Endpoint, update both endpoints when the address changes.

### Set the Function Endpoint

Append `/functions` to the HTTPS URL under `Forwarding` and save it as the **Function Endpoint** in the Developer Portal. For example, use `https://YOUR-NGROK-DOMAIN/functions`. App Store appends `/v1` when making a versioned request.

### Register the app server

Build and start the server from the project root. `pnpm --dir server start` loads `server/.env`. With `autoRegister: true`, startup registers your app functions in this order.

1. The SDK uses the App Secret to obtain an app token from App Store.
2. It uses the app token to register `core:v1`, the versioned Extension contract for listing app functions.
3. App Store sends a signed `extension.core.function.getFunctions` request to the Function Endpoint to list the functions.
4. The SDK returns the names and input and output schemas from the `@Func` providers.

```sh
pnpm --dir server build
pnpm --dir server start
```

### Inspect a real request in Developer tools

1. When the server logs `Successfully registered extension: core`, find **주문 관리 시스템** in the test channel's **App Store** and select **Install**.
2. Select **Developer tools** on the app's details page.
3. In the **Functions** tab, select `ping` and then **Execute**. Look for `{"message":"pong"}` in **Execution result**.

After calling the Function, check the server terminal to see how `ctx` arrives. This example shows `caller` and `channel` information.

```text
ping function call {
  ctx: {
    caller: { type: 'manager', id: 'example-manager-id' },
    channel: { id: 'example-channel-id' }
  },
  input: {}
}
```

`ctx.caller.type` identifies who made the call. It can be `manager` (a team member), `user` (a customer), `system` (a system process such as an automation), or `app` (an application). `ctx.channel.id` identifies the channel for the request.

## 2. Add an order lookup Function

Add a sample order service and an order lookup Function to the same app.

Create `server/src/orders.service.ts` with the code below. `OrderService` stores sample orders in memory per channel. `order-1` starts as shipped, and `order-2` and `order-3` start as pending so you can cancel them later. Restarting the server restores the initial sample orders.

```ts
import { Injectable } from "@nestjs/common";

type OrderStatus = "pending" | "shipped" | "cancelled";

export class NotFoundError extends Error {}

@Injectable()
export class OrderService {
  private readonly ordersByChannel = new Map<string, Map<string, OrderStatus>>();

  getStatus(channelId: string, orderId: string) {
    const status = this.ordersFor(channelId).get(orderId);
    if (!status) {
      throw new NotFoundError("Order not found");
    }
    return { orderId, status };
  }

  private ordersFor(channelId: string) {
    let orders = this.ordersByChannel.get(channelId);
    if (!orders) {
      orders = new Map<string, OrderStatus>([
        ["order-1", "shipped"],
        ["order-2", "pending"],
        ["order-3", "pending"],
      ]);
      this.ordersByChannel.set(channelId, orders);
    }
    return orders;
  }
}
```

**Channel-level authorization**

An app can be installed in multiple channels. This example uses `ctx.channel.id` from the request context to keep each channel's orders separate. When looking up or canceling real orders, also check that the caller has permission to perform that action in the channel.

Create `server/src/orders.function.ts` with the code below. `OrderFunctions` uses the channel ID in the request to look up orders in `OrderService`. When an order is missing, `OrderService` throws `NotFoundError` and `OrderFunctions` converts it to the SDK's `FunctionCallError`.

```ts
import { Injectable } from "@nestjs/common";
import {
  type Context,
  Ctx,
  Func,
  FunctionCallError,
  FunctionCallErrorCode,
  Input,
  InputSchema,
  OutputSchema,
} from "@channel.io/app-sdk-server";
import { z } from "zod";
import { NotFoundError, OrderService } from "./orders.service.js";

const GetStatusInputSchema = z.object({ orderId: z.string() });
type GetStatusInput = z.infer<typeof GetStatusInputSchema>;
const GetStatusOutputSchema = z.object({ orderId: z.string(), status: z.string() });

@Injectable()
export class OrderFunctions {
  constructor(private readonly orderService: OrderService) {}

  @Func({
    name: "orders.getStatus",
    description: "Look up the shipping status of an order by its ID.",
  })
  @InputSchema(GetStatusInputSchema)
  @OutputSchema(GetStatusOutputSchema)
  getStatus(@Ctx() ctx: Context, @Input() input: GetStatusInput) {
    console.log("orders.getStatus function call", { ctx, input });
    try {
      return this.orderService.getStatus(ctx.channel.id, input.orderId);
    } catch (error) {
      if (error instanceof NotFoundError) {
        throw new FunctionCallError(error.message, FunctionCallErrorCode.NotFound);
      }
      throw error;
    }
  }
}
```

Add the imports below to `server/src/index.ts`, then add `OrderService` and `OrderFunctions` to `providers` in `@Module`.

```ts
// server/src/index.ts (add imports)
import { OrderFunctions } from "./orders.function.js";
import { OrderService } from "./orders.service.js";
```

```ts
// server/src/index.ts (AppModule providers)
providers: [PingFunctions, OrderService, OrderFunctions],
```

Stop the server with `Ctrl+C`, then rebuild and restart it.

```sh
pnpm --dir server build
pnpm --dir server start
```

After App Store refreshes the Function list, select `getStatus` in Developer tools. The details show the full name, `orders.getStatus`. Enter `order-1` for `orderId` and select **Execute**. Check for `shipped` in the response and the log below in the server terminal.

```text
orders.getStatus function call {
  ctx: {
    caller: { type: 'manager', id: 'example-manager-id' },
    channel: { id: 'example-channel-id' }
  },
  input: { orderId: 'order-1' }
}
```

If a Function is missing, keep the server running and check the `core:v1` registration and Function Endpoint. If **Execute** is disabled, check that you installed the app in the current channel and filled in any required inputs.

## 3. Register a Command Extension and open a WAM

Commands let you run app features while chatting. Type `/` in the team chat message composer to open the command list.

To add a command to your app, use the Command Extension to specify the command's name and the app Function to call. In this step, register `command:v1` and use `/cancel-order` to open the order cancellation screen.

1. App Store calls `extension.command.metadata.getCommands` to read the definition of `/cancel-order`.
2. When someone runs the command in team chat, App Store calls the `actionFunctionName`, `commands.orders.cancel`. With `systemVersion: "v1"`, the request goes to `PUT /functions/v1`.
3. The action Function returns `type: "wam"`, the WAM's `name`, and `wamArgs` for the screen.
4. The Channel Talk client appends `name` to the registered WAM Endpoint and loads the screen from that URL.

### Add the Command to the app server

Create `server/src/command.extension.ts` with the code below. `CommandExtension` defines the command, and `commands.orders.cancel` in `CommandActions` opens the WAM.

```ts
import { Injectable } from "@nestjs/common";
import {
  type Context,
  CommandResultSchema,
  Ctx,
  Extension,
  Func,
  type GetCommandsInput,
  GetCommandsOutputSchema,
  Input,
  InputSchema,
  OutputSchema,
} from "@channel.io/app-sdk-server";
import { z } from "zod";

@Extension({ name: "command", systemVersion: "v1" })
export class CommandExtension {
  @Func("metadata.getCommands")
  @OutputSchema(GetCommandsOutputSchema)
  getCommands(@Ctx() ctx: Context, @Input() input: GetCommandsInput) {
    console.log("extension.command.metadata.getCommands function call", { ctx, input });
    return {
      commands: [
        {
          name: "cancel-order",
          scope: "desk",
          description: "Open order cancellation",
          actionFunctionName: "commands.orders.cancel",
          systemVersion: "v1",
          alfMode: "disable",
          enabledByDefault: true,
          paramDefinitions: [{ name: "orderId", type: "string", required: true }],
        },
      ],
    };
  }
}

const ExecuteCancelOrderInputSchema = z.object({
  input: z.object({ orderId: z.string() }),
});
type ExecuteCancelOrderInput = z.infer<typeof ExecuteCancelOrderInputSchema>;

@Injectable()
export class CommandActions {
  @Func("commands.orders.cancel")
  @InputSchema(ExecuteCancelOrderInputSchema)
  @OutputSchema(CommandResultSchema)
  executeCancelOrder(@Ctx() ctx: Context, @Input() input: ExecuteCancelOrderInput) {
    console.log("commands.orders.cancel function call", { ctx, input });
    const { orderId } = input.input;
    return {
      type: "wam",
      attributes: {
        appId: process.env["APP_ID"] ?? "",
        name: "order-cancel",
        wamArgs: { orderId },
      },
    };
  }
}
```

The SDK prefixes functions inside `@Extension` with `extension.<name>.`, so `metadata.getCommands` registers as `extension.command.metadata.getCommands`. Standalone functions such as those in `CommandActions` keep the full name declared in `@Func`. Developer tools groups `orders.getStatus` under `orders` as `getStatus`.

| Setting                  | What it does here                                                                                   |
| ------------------------ | --------------------------------------------------------------------------------------------------- |
| `scope: "desk"`          | Shows the command in the Desk. `front` targets the customer messenger.                              |
| `alfMode: "disable"`     | Disables ALF recommendations for the command. Step 5 uses the separate `orders.getStatus` function. |
| `enabledByDefault: true` | Enables the command by default when the app is installed.                                           |
| `paramDefinitions`       | Defines the fields and their types in the command form. The order ID is required here.              |
| `systemVersion: "v1"`    | Sends the action request to the `/v1` path under the Function Endpoint.                             |

Command execution requests can also carry fields such as `chat` and `language`. App Store puts the values from the command form in the nested `input` object, so the action reads the order ID from `input.input.orderId`. [Command Extension guide](extensions/command.md)

The `name` returned by `commands.orders.cancel` is the path segment added to the WAM Endpoint. Later, when you build the WAM in React, you'll use `useWamData("orderId")` to read the order ID from `wamArgs` and display it.

When you build another WAM, set the action's `name` to the new WAM's name. Keep each WAM's source in `wam/<name>` and serve its built files under `/wam/<name>/`.

Add the import below to `server/src/index.ts`, then add `CommandExtension` and `CommandActions` to `providers` in `@Module`.

```ts
// server/src/index.ts (add imports)
import { CommandExtension, CommandActions } from "./command.extension.js";
```

```ts
// server/src/index.ts (AppModule providers)
providers: [
  PingFunctions,
  OrderService,
  OrderFunctions,
  CommandExtension,
  CommandActions,
],
```

### Build and serve the WAM

Replace the contents of `pnpm-workspace.yaml` in the project root with the configuration below. The `wam/*` pattern adds each WAM as a separate workspace package.

```yaml
packages:
  - server
  - "wam/*"

allowBuilds:
  esbuild: true
  protobufjs: false
```

`esbuild: true` allows the install script for `esbuild`, which Vite uses.

From the project root, run these commands to scaffold `wam/order-cancel` with Vite’s React and TypeScript template and install the WAM SDK. Keep the `package.json`, TypeScript configuration, and ESLint configuration from the template.

```sh
pnpm create vite@7 wam/order-cancel --template react-ts --no-interactive
pnpm --dir wam/order-cancel add @channel.io/app-sdk-wam
```

Update `wam/order-cancel/vite.config.ts` as shown below. With `base: "./"`, the built HTML loads JavaScript and other assets relative to `/wam/order-cancel/`.

```ts
// wam/order-cancel/vite.config.ts
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  base: "./",
  build: {
    outDir: "../../server/dist/static/order-cancel",
    emptyOutDir: true,
  },
});
```

Replace the contents of `wam/order-cancel/src/main.tsx` and `wam/order-cancel/src/App.tsx` with the code below.

```tsx
// wam/order-cancel/src/main.tsx
import { createRoot } from "react-dom/client";
import { WamProvider } from "@channel.io/app-sdk-wam";
import App from "./App.tsx";

createRoot(document.getElementById("root")!).render(
  <WamProvider>
    <App />
  </WamProvider>,
);
```

```tsx
// wam/order-cancel/src/App.tsx
import { useEffect } from "react";
import { useWamData, useWamSize } from "@channel.io/app-sdk-wam";

export default function App() {
  const orderId = useWamData("orderId");
  const { setSize } = useWamSize();
  useEffect(() => setSize({ width: 400, height: 200 }), [setSize]);

  return <h1>{typeof orderId === "string" ? `Order ${orderId}` : "Order cancellation"}</h1>;
}
```

Add the following imports at the top of `server/src/index.ts`.

```ts
// server/src/index.ts (add import)
import { resolve } from "node:path";
```

In the same file, add the code below just before `await app.listen(3000)`. The server serves the `static/` directory next to the compiled `index.js` at `/wam`.

```ts
// server/src/index.ts (before app.listen(...))
app.useStaticAssets(resolve(import.meta.dirname, "static"), {
  prefix: "/wam",
});
```

Append `/wam` to the HTTPS URL shown under `Forwarding` in ngrok. In the Developer Portal, open **Server settings** for **주문 관리 시스템**, enter the URL in **WAM Endpoint**, and select **Save**. For example, use `https://YOUR-NGROK-DOMAIN/wam`.

App Store adds the `name` value, `order-cancel`, to this URL and sends `GET /wam/order-cancel/` to the app server.

Stop the server. From the project root, build the server and WAM separately, then start the server again.

```sh
pnpm --dir server build
pnpm --dir wam/order-cancel build
pnpm --dir server start
```

Vite writes the WAM build to `server/dist/static/order-cancel/`.

Check the server log for successful `command` registration. In channel settings, open **App Store**, select **주문 관리 시스템**, and open the **Command** tab. Find `/cancel-order` under **Desk commands** and turn on its switch if it is off.

In the test channel's team chat, type `/` in the message composer and select `/cancel-order`. Enter `order-2` and run the command. Check that the WAM displays **Order order-2**.

If the command is missing, check the `command` registration log and confirm that the app is installed. If the command appears but the WAM fails to open, check the WAM Endpoint and open `http://127.0.0.1:3000/wam/order-cancel/` to check the page.

## 4. Cancel an order and notify the manager

`orders.getStatus` reads the order status. Now add `orders.cancel` to change it. Run the Function in Developer tools or from the WAM opened by `/cancel-order`. When a manager cancels an order for the first time, read their ID from `ctx` and notify them through a Native Function.

### Decide which orders can be cancelled

Replace `server/src/orders.service.ts` with the code below. Only `pending` orders can be cancelled. The method returns `false` for an already cancelled order.

```ts
// server/src/orders.service.ts (replace the file)
import { Injectable } from "@nestjs/common";

type OrderStatus = "pending" | "shipped" | "cancelled";

export class NotFoundError extends Error {}

export class OrderNotCancellableError extends Error {}

@Injectable()
export class OrderService {
  private readonly ordersByChannel = new Map<string, Map<string, OrderStatus>>();

  getStatus(channelId: string, orderId: string) {
    const status = this.ordersFor(channelId).get(orderId);
    if (!status) {
      throw new NotFoundError("Order not found");
    }
    return { orderId, status };
  }

  cancel(channelId: string, orderId: string) {
    const { status } = this.getStatus(channelId, orderId);
    if (status === "cancelled") return false;
    if (status !== "pending") {
      throw new OrderNotCancellableError("Only pending orders can be cancelled");
    }

    this.ordersFor(channelId).set(orderId, "cancelled");
    return true;
  }

  private ordersFor(channelId: string) {
    let orders = this.ordersByChannel.get(channelId);
    if (!orders) {
      orders = new Map<string, OrderStatus>([
        ["order-1", "shipped"],
        ["order-2", "pending"],
        ["order-3", "pending"],
      ]);
      this.ordersByChannel.set(channelId, orders);
    }
    return orders;
  }
}
```

### Send the notification from the cancellation Function

Earlier, Channel Talk called app functions through App Store. To send the notification, the app server calls Channel Talk’s `announce` Native Function through App Store. The request uses the token for the channel receiving the notification.

In **Authentication and permissions** in the Developer Portal, add `announce` to the **Channel** role and save.

Create `server/src/alert.service.ts` with the code below. `AlertService` obtains a channel token from the `TokenManager` provided by `ChannelAppModule` and calls `announce`. The message goes to the specified manager in **My Chatroom**.

```ts
import { Injectable } from "@nestjs/common";
import { NativeFunctionClient, TokenManager } from "@channel.io/app-sdk-server";

@Injectable()
export class AlertService {
  constructor(
    private readonly tokenManager: TokenManager,
    private readonly nativeFunctionClient: NativeFunctionClient,
  ) {}

  async send(input: {
    channelId: string;
    managerId: string;
    message: string;
    writer: string;
  }) {
    const { channelId, managerId, message, writer } = input;
    const { accessToken } = await this.tokenManager.getChannelToken({ channelId });
    const params = {
      channelId,
      managerIds: [managerId],
      message: { plainText: message },
      botName: writer,
    };
    const { sent } = await this.nativeFunctionClient.callNativeFunctionWithToken<
      typeof params,
      { sent?: number }
    >("announce", params, accessToken);
    return (sent ?? 0) > 0;
  }
}
```

By default, the SDK’s `getChannelToken()` caches tokens in memory by channel. It reuses the cached token and refreshes it on a call when it is close to expiring.

Replace `server/src/orders.function.ts` with the code below. It adds `orders.cancel` alongside the lookup function and injects `AlertService` through the constructor. The cancellation applies to the channel in `ctx.channel.id`. When a manager cancels an order for the first time, the function notifies that manager.

```ts
// server/src/orders.function.ts (replace the file)
import { Injectable } from "@nestjs/common";
import {
  type Context,
  Ctx,
  Func,
  FunctionCallError,
  FunctionCallErrorCode,
  Input,
  InputSchema,
  OutputSchema,
} from "@channel.io/app-sdk-server";
import { z } from "zod";
import { AlertService } from "./alert.service.js";
import { NotFoundError, OrderNotCancellableError, OrderService } from "./orders.service.js";

const GetStatusInputSchema = z.object({ orderId: z.string() });
type GetStatusInput = z.infer<typeof GetStatusInputSchema>;
const GetStatusOutputSchema = z.object({ orderId: z.string(), status: z.string() });

const CancelOrderInputSchema = z.object({ orderId: z.string() });
type CancelOrderInput = z.infer<typeof CancelOrderInputSchema>;
const CancelOrderOutputSchema = z.object({
  orderId: z.string(),
  status: z.literal("cancelled"),
  notification: z.enum(["sent", "failed", "skipped"]),
});

@Injectable()
export class OrderFunctions {
  constructor(
    private readonly orderService: OrderService,
    private readonly alertService: AlertService,
  ) {}

  @Func({
    name: "orders.getStatus",
    description: "Look up the shipping status of an order by its ID.",
  })
  @InputSchema(GetStatusInputSchema)
  @OutputSchema(GetStatusOutputSchema)
  getStatus(@Ctx() ctx: Context, @Input() input: GetStatusInput) {
    console.log("orders.getStatus function call", { ctx, input });
    try {
      return this.orderService.getStatus(ctx.channel.id, input.orderId);
    } catch (error) {
      if (error instanceof NotFoundError) {
        throw new FunctionCallError(error.message, FunctionCallErrorCode.NotFound);
      }
      throw error;
    }
  }

  @Func({
    name: "orders.cancel",
    description: "Cancel a pending sample order and notify the calling manager.",
  })
  @InputSchema(CancelOrderInputSchema)
  @OutputSchema(CancelOrderOutputSchema)
  async cancel(@Ctx() ctx: Context, @Input() input: CancelOrderInput) {
    console.log("orders.cancel function call", { ctx, input });
    const { orderId } = input;
    const channelId = ctx.channel.id;

    let changed: boolean;
    try {
      changed = this.orderService.cancel(channelId, orderId);
    } catch (error) {
      if (error instanceof NotFoundError) {
        throw new FunctionCallError(error.message, FunctionCallErrorCode.NotFound);
      }
      if (error instanceof OrderNotCancellableError) {
        throw new FunctionCallError(error.message, FunctionCallErrorCode.Conflict);
      }
      throw error;
    }

    const result = { orderId, status: "cancelled" } as const;
    const managerId = ctx.caller?.type === "manager" ? ctx.caller.id : undefined;
    if (!changed || !managerId) {
      return { ...result, notification: "skipped" };
    }

    try {
      const sent = await this.alertService.send({
        channelId,
        managerId,
        message: `Order ${orderId} was cancelled.`,
        writer: "Order Management",
      });
      return { ...result, notification: sent ? "sent" : "failed" };
    } catch {
      console.error("Could not send order cancellation notification", { orderId });
      return { ...result, notification: "failed" };
    }
  }
}
```

`notification` is `sent` when the announcement is sent and `failed` if sending fails. It is `skipped` when there is no manager ID or the order was already cancelled. The order stays cancelled if notification fails.

### Confirm cancellation in the WAM

Replace `wam/order-cancel/src/App.tsx` with the following code. The WAM displays the order ID from the command. Selecting **Confirm cancellation** runs `orders.cancel` through `useCallFunction`.

```tsx
// wam/order-cancel/src/App.tsx (replace the file)
import { useEffect, useState } from "react";
import { useCallFunction, useWamData, useWamSize } from "@channel.io/app-sdk-wam";

type CancelResult = {
  orderId: string;
  status: "cancelled";
  notification: "sent" | "failed" | "skipped";
};
type CancelResponse = { result?: CancelResult; error?: { message: string } };

const messages = {
  sent: "Order cancelled. Check My Chatroom for the notification.",
  failed: "Order cancelled. Could not confirm the notification.",
  skipped: "Order cancelled.",
};

export default function App() {
  const appId = useWamData("appId");
  const orderId = useWamData("orderId");
  const { call: cancelOrder, loading } = useCallFunction<CancelResponse>({
    appId: typeof appId === "string" ? appId : "",
    name: "orders.cancel",
  });
  const [result, setResult] = useState<CancelResult>();
  const [error, setError] = useState("");
  const { setSize } = useWamSize();
  useEffect(() => setSize({ width: 400, height: 200 }), [setSize]);

  if (typeof appId !== "string" || !appId || typeof orderId !== "string" || !orderId) {
    return <p>Open this WAM with /cancel-order.</p>;
  }

  async function handleCancelOrder() {
    setError("");
    try {
      const response = await cancelOrder({ orderId });
      if (!response.result) {
        setError(response.error?.message ?? "Could not cancel the order.");
        return;
      }
      setResult(response.result);
    } catch {
      setError("Could not confirm the result. Check the order status.");
    }
  }

  return (
    <main>
      <h1>Cancel order {orderId}</h1>
      <button type="button" onClick={handleCancelOrder} disabled={loading || !!result}>
        Confirm cancellation
      </button>
      {result && <p role="status">{messages[result.notification]}</p>}
      {error && <p role="alert">{error}</p>}
    </main>
  );
}
```

Finally, replace `server/src/index.ts` with the code below. It adds `AlertService` to `providers` and includes the signature guard and WAM static file mount from the earlier steps.

The WAM hook `useCallFunction` has no version option. App Store can forward this call to `PUT /functions`, and the SDK controller listens at `PUT /functions/:version`. The middleware below runs before NestJS routing and guards and changes only the unversioned request path to `/functions/v1`. The SDK’s `SignatureGuard` verifies the original request body for both paths.

```ts
// server/src/index.ts (replace the file)
import { resolve } from "node:path";
import "reflect-metadata";
import { Module } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import type { NestExpressApplication } from "@nestjs/platform-express";
import {
  CHANNEL_APP_OPTIONS,
  ChannelAppModule,
  SignatureGuard,
} from "@channel.io/app-sdk-server";
import { AlertService } from "./alert.service.js";
import { CommandActions, CommandExtension } from "./command.extension.js";
import { OrderFunctions } from "./orders.function.js";
import { OrderService } from "./orders.service.js";
import { PingFunctions } from "./ping.function.js";

@Module({
  imports: [
    ChannelAppModule.forRoot({
      appId: process.env["APP_ID"] ?? "",
      appSecret: process.env["APP_SECRET"] ?? "",
      signingKey: process.env["SIGNING_KEY"] ?? "",
      autoRegister: true,
    }),
  ],
  providers: [
    PingFunctions,
    OrderService,
    OrderFunctions,
    CommandExtension,
    CommandActions,
    AlertService,
  ],
})
class AppModule {}

const app = await NestFactory.create<NestExpressApplication>(AppModule, {
  rawBody: true,
});
app.useGlobalGuards(new SignatureGuard(app.get(CHANNEL_APP_OPTIONS)));
app.use((request: { method: string; url: string }, _response: unknown, next: () => void) => {
  if (request.method === "PUT" && request.url === "/functions") {
    request.url = "/functions/v1";
  }
  next();
});
app.useStaticAssets(resolve(import.meta.dirname, "static"), {
  prefix: "/wam",
});
await app.listen(3000);
```

### Verify the Function and Command

Stop the server. From the project root, rebuild the server and WAM separately, then start the server again.

```sh
pnpm --dir server build
pnpm --dir wam/order-cancel build
pnpm --dir server start
```

1. Open **Developer tools** for the app, select `orders.cancel`, and run it with `order-2`. Confirm `status: "cancelled"` and `notification: "sent"`. In Team Chat, select your name to open **My Chatroom** and check for `Order order-2 was cancelled.`.
2. In a team chat in the same test channel, choose `/cancel-order` and enter `order-3`. Check the order ID in the WAM and select **Confirm cancellation**. Look for `Order order-3 was cancelled.` in **My Chatroom**.
3. In Developer tools, run `orders.getStatus` with `order-3` to confirm `cancelled`. Calling the cancellation Function for that order again returns `notification: "skipped"`.

## 5. Look up orders with CoS and ALF

Keep the server and ngrok running and try `orders.getStatus` from CoS and ALF in the same test channel.

- **Call it from CoS.** When the installed app exposes the function to CoS, open **AI CoS** in the left sidebar and ask “Use the Order Management app to check the shipping status of order-1.” [Learn about CoS](https://docs.channel.io/help/en/articles/CoS-a8e86305)
- **Use it in an ALF task.** Open a test task under **Customer → Support → Settings → Tasks**. In the **AI Agent** step, type `@` in the instructions and insert `orders.getStatus` from the installed app. Tell ALF to pass `order-1` as `orderId` and report the returned `status`, then try it in **Preview**. [ALF task guide](https://docs.channel.io/help/en/articles/Task--2a16be8b)
- **Use it in an ALF procedure.** In a test channel with access to procedures, open the procedure editor under **Customer → Support → ALF → Settings → Procedures**. Add `orders.getStatus` with the **App** tool in the instructions and tell ALF to run it after confirming the order ID. Ask for `order-1` in the **Preview** panel. [ALF procedure guide (Korean)](https://docs.channel.io/help/ko/articles/%ED%94%84%EB%A1%9C%EC%8B%9C%EC%A0%80Beta-6d520d9d)

In each case, check that the order status is `shipped` and that the server logged `orders.getStatus function call`. A typical CoS app call uses `manager` when it has a team member ID. An ALF task can use `manager` in a team member's preview, `user` when it has customer context, or `system` when it has neither. Check `ctx.caller.type` in the server log for the call you ran.

## Next steps

You registered app functions, opened a WAM from a Command, and called a Native Function to send a cancellation notification. You also reused the order lookup in CoS and ALF. Stop the server and ngrok when you finish.

- Review request directions and authentication in [App concepts](concepts.md).
- Define names, schemas, requests, and responses with the [Function guide](functions.md).
- Add screens and capabilities with the [WAM guide](wam.md) and [Extension guide](extensions.md).
- Review what your production environment needs in [App development and operations](app-development.md).
- Run the original TypeScript or Go example project with the [legacy Quickstart](quickstart-legacy.md).
