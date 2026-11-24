# Build a simple app server

As you build a sample order management system and connect it to Channel Talk, you’ll see how an app receives requests and calls Channel Talk features. Call `ping` in Developer tools to check your setup, then implement Functions that look up and cancel orders. Look up an order in Developer tools, then register `/cancel-order` with a Command Extension and confirm the cancellation in a WAM. When a manager cancels an order, the app server calls a Native Function to notify them.

## Requirements

- Install the latest **Node.js 24 LTS** patch release. [Download Node.js](https://nodejs.org/en/download)
- Install **pnpm 10.26 or later** to manage dependencies and build the server and WAM packages. [Install pnpm](https://pnpm.io/installation)
- Use a **code editor and terminal**. Keep the server running in one terminal and enter tutorial commands in another.
- Set up the **ngrok CLI and an account**. Use it to give the local server an HTTPS address that App Store can reach. [Install and configure ngrok](https://ngrok.com/docs/getting-started/)

Run these commands one at a time in your terminal to check the installed versions.

```sh
node --version
pnpm --version
ngrok --version
```

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
pnpm --dir server add @channel.io/app-sdk-server @nestjs/common@11 @nestjs/core@11 @nestjs/platform-express@11 reflect-metadata zod@3
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

Create `server/src/ping.function.ts` with the code below. `ping` takes no input and returns `pong` in `message`. `@Func` declares the Function name. `@InputSchema` and `@OutputSchema` define its input and output.

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

### Expose the server with ngrok

Give App Store an HTTPS address for your local server. Run the first command if you still need to configure your ngrok auth token. Run `ngrok http 3000` in another terminal and leave it running.

```sh
ngrok config add-authtoken YOUR_NGROK_AUTHTOKEN
ngrok http 3000
```

### Set the Function Endpoint

Append `/functions` to the HTTPS URL under `Forwarding` and save it as the **Function Endpoint** in the Developer Portal. For example, use `https://YOUR-NGROK-DOMAIN/functions`. App Store appends `/v1` when making a versioned request.

### Register the app server

Build and start the server from the project root. `pnpm --dir server start` loads `server/.env`. With `autoRegister: true`, the SDK uses the App Secret to obtain an app token and register `core:v1`. App Store sends a signed request to the Function Endpoint to discover `ping`.

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

> **Channel-level authorization**
>
> An app can be installed in multiple channels. This example uses `ctx.channel.id` from the request context to keep each channel's orders separate. When looking up or canceling real orders, also check that the caller has permission to perform that action in the channel.

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

App Store reads the `/cancel-order` definition from `metadata.getCommands`. When you run the command, it calls the `actionFunctionName`, `commands.orders.cancel`. Setting `systemVersion: "v1"` sends this request to the SDK at `PUT /functions/v1`. The Function returns a WAM name, and Channel loads the page from the app's WAM Endpoint.

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

Declare the error below above the `OrderService` class in `server/src/orders.service.ts`.

```ts
// server/src/orders.service.ts (before OrderService)
export class OrderNotCancellableError extends Error {}
```

Add this method to `OrderService`. Only `pending` orders can be cancelled. The method returns `false` for an already cancelled order.

```ts
  // server/src/orders.service.ts (inside OrderService)
  cancel(channelId: string, orderId: string) {
    const { status } = this.getStatus(channelId, orderId);
    if (status === "cancelled") return false;
    if (status !== "pending") {
      throw new OrderNotCancellableError("Only pending orders can be cancelled");
    }

    this.ordersFor(channelId).set(orderId, "cancelled");
    return true;
  }
```

### Send the notification from the cancellation Function

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

Add the import below to `server/src/index.ts`, then register `AlertService` in `providers` in `@Module`.

```ts
// server/src/index.ts (add import)
import { AlertService } from "./alert.service.js";
```

In `server/src/orders.function.ts`, import `AlertService` and update the import from `./orders.service.js` as shown below.

```ts
// server/src/orders.function.ts (update imports)
import { AlertService } from "./alert.service.js";
import { NotFoundError, OrderNotCancellableError, OrderService } from "./orders.service.js";
```

Add the cancellation input schema, input type, and output schema after `GetStatusOutputSchema`.

```ts
// server/src/orders.function.ts (after GetStatusOutputSchema)
const CancelOrderInputSchema = z.object({ orderId: z.string() });
type CancelOrderInput = z.infer<typeof CancelOrderInputSchema>;
const CancelOrderOutputSchema = z.object({
  orderId: z.string(),
  status: z.literal("cancelled"),
  notification: z.enum(["sent", "failed", "skipped"]),
});
```

Replace the `OrderFunctions` constructor with the following to inject `AlertService`.

```ts
  // server/src/orders.function.ts (replace the OrderFunctions constructor)
  constructor(
    private readonly orderService: OrderService,
    private readonly alertService: AlertService,
  ) {}
```

Add the cancellation Function to the same class. It uses `ctx.channel.id` to cancel the order in that channel through `OrderService`. The first time an order is cancelled, `AlertService` notifies the manager identified by `ctx.caller` if a manager ID is present.

```ts
  // server/src/orders.function.ts (inside OrderFunctions)
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

The WAM SDK's `useCallFunction` omits the version, so App Store can send `PUT /functions`. Add this code before `app.listen(...)` in `server/src/index.ts` to route that request to the same SDK handler and signature check at `/functions/v1`.

```ts
// server/src/index.ts (before app.listen(...))
app.use((request: { method: string; url: string }, _response: unknown, next: () => void) => {
  if (request.method === "PUT" && request.url === "/functions") {
    request.url = "/functions/v1";
  }
  next();
});
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

Keep the server and ngrok running and try `orders.getStatus` on other surfaces in the same test channel.

- **Call it from CoS.** CoS can call a Function exposed to it by an app installed in the channel. In the AI CoS tab, ask “Use my tutorial app to check the shipping status of order-1.” [Learn about CoS](https://docs.channel.io/help/en/articles/CoS-a8e86305)
- **Use it in an ALF task.** In the AI Agent step of a test task, type `@` in the instructions and insert `orders.getStatus` from the installed app. Tell ALF to pass `order-1` as `orderId` and report the returned `status`. [ALF task guide](https://docs.channel.io/help/en/articles/Task--2a16be8b), [Insert an app Function in a task (Korean)](https://docs.channel.io/help/ko/articles/%ED%83%9C%EC%8A%A4%ED%81%AC-ALF-v2-2a16be8b)
- **Use it in an ALF procedure.** In a channel with access to procedures, add `orders.getStatus` using the app tool in the instructions. Tell ALF to call it after confirming the order ID and use the returned status in its reply. [ALF procedure guide (Korean)](https://docs.channel.io/help/ko/articles/%ED%94%84%EB%A1%9C%EC%8B%9C%EC%A0%80Beta-6d520d9d)

Stop the server and ngrok when you finish. If the ngrok URL changes, update both the Function Endpoint and the WAM Endpoint.
