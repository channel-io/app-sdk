# はじめての Channel アプリを作る

[Channel App SDK](https://github.com/channel-io/app-sdk) でサンプルの注文管理システムを作り、チャネルトークと連携します。チャネルトークは HTTP でアプリサーバーを呼び出し、アプリのコードは開発者が起動したサーバーで動きます。チャネル設定の **アプリストア** は、アプリをインストールする画面です。その裏側で App Store がインストールや Extension の登録を管理し、関数の呼び出しを中継します。

```text
チャネルトーク → App Store → アプリサーバー   アプリ関数を呼び出す
アプリサーバー → App Store → チャネルトーク   Native Function を呼び出す
チャネルトークのクライアント → WAM Endpoint   Web 画面を読み込む
```

- **アプリ関数**は、注文の照会など、アプリサーバーが提供する機能です。**開発者ツール**で試した関数を、コマンド、ALF、CoS からも呼び出せます。
- **Extension** は、コマンドなど、チャネルトークで使える機能に必要な関数やメタデータの取り決めです。
- **WAM（Web App Module）** は、チャネルトーク内で開くアプリの Web 画面です。クライアントが WAM Endpoint から直接画面を読み込みます。
- **Native Function** は、通知の送信など、アプリが呼び出せるチャネルトークの機能です。

まず `ping` で接続を確認して、注文を照会する関数を追加します。次に `/cancel-order` で WAM を開いて注文をキャンセルし、Native Function で担当者に通知します。最後に、照会関数を CoS と ALF でも使ってみます。 [アプリの基本概念](concepts.md)

## 事前準備

- **Node.js 24 LTS** の最新パッチ版をインストールします。[Node.js をダウンロード](https://nodejs.org/en/download)
- **pnpm 10.26 以降（10.x）**をインストールします。サーバーと WAM の依存パッケージの管理やビルドに使います。[pnpm のインストール](https://pnpm.io/installation)
- **コードエディターとターミナル**を用意します。一方のターミナルでサーバーを起動し、もう一方でコマンドを実行します。
- **ngrok CLI とアカウント**を準備します。App Store からローカルサーバーに接続するための HTTPS URL を割り当てます。[ngrok のインストールと設定](https://ngrok.com/docs/getting-started/)
- アプリをインストールできる**テスト用チャネル**を用意し、[Channel Developer Portal](https://channel.works/-/developers/apps) にログインします。

HTTP のリクエストとレスポンス、TypeScript のモジュールを知っていると、コードを読み進めやすくなります。この実習では、[NestJS のデコレーターと依存性注入](https://docs.nestjs.com/providers)を使います。関数を登録し、`providers` に登録したサービスをコンストラクターで受け取ります。[Zod](https://zod.dev/) で関数の入出力を定義し、[React](https://react.dev/) で作った画面を [Vite](https://vite.dev/) でビルドします。

## 1. 最初のアプリを作成する

開発者ポータルでアプリを作成し、発行したキーを `server/.env` に保存します。Channel App SDK で `ping` を実装して [NestJS](https://nestjs.com/) ベースのサーバーを起動し、開発者ツールで関数を呼び出して接続を確認します。

### Channel Developer Portal でアプリを作成する

[Channel Developer Portal](https://channel.works/-/developers/apps) を開き、アプリの作成を選択します。アプリ名に **주문 관리 시스템** と入力し、**Legacy token** を選びます。利用規約に同意して確定すると、非公開アプリが作成されます。

### アプリ ID とキーを保存する

アプリを作成したら、以下のコマンドで実習用のディレクトリを作成して移動します。

```sh
mkdir order-management
cd order-management
mkdir -p server/src
touch server/.env
```

`server/.env` を開き、以下のように記述します。Git を使う場合は、値を入力する前に `.env` を `.gitignore` に追加します。Secret と Signing Key は発行直後に一度だけ画面に表示されます。画面を閉じる前に、それぞれの値を `server/.env` に保存します。

```dotenv
APP_ID=
APP_SECRET=
SIGNING_KEY=
```

アプリ名の下にある **Application ID** を `APP_ID` に設定します。App Store はこの値でアプリを識別します。

**認証と権限**で **Secret** を発行し、値を `APP_SECRET` に設定します。SDK はこの値を使って App Store からアプリトークンを取得します。

サーバー連携タブの **サーバー設定**で **Signing Key** を発行し、値を `SIGNING_KEY` に設定します。サーバーはこの値で App Store からのリクエストの署名を検証します。

| 値               | 用途                                                                  |
| ---------------- | --------------------------------------------------------------------- |
| App ID           | アプリを識別する公開 ID                                               |
| App Secret       | SDK がアプリトークンとチャネルトークンを取得するための秘密情報        |
| Signing Key      | App Store から届いたリクエストの署名を検証するキー                    |
| アプリトークン   | Extension の登録など、アプリ単位の操作に使うトークン                  |
| チャネルトークン | アプリをインストールしたチャネルで Native Function を呼び出すトークン |

**Signing Key が必要な理由。** 署名を検証しないと、第三者が App Store を装ってアプリ関数を呼び出せます。App Store は Signing Key とリクエスト本文から HMAC-SHA256 署名を計算し、Base64 でエンコードして `x-signature` ヘッダーに入れます。SDK の `SignatureGuard` は、受け取った本文の元のバイト列から署名を再計算します。**署名が一致したリクエストだけを関数に渡します。**

### プロジェクトを準備する

プロジェクトルートに `pnpm-workspace.yaml` を作成し、以下のように `server` を登録します。

```yaml
packages:
  - server

allowBuilds:
  protobufjs: false
```

`allowBuilds` はインストール時に実行できる依存パッケージのスクリプトを指定します。サーバー SDK が使う `protobufjs` に `false` を指定し、インストールスクリプトをスキップします。

`server/package.json` を作成し、以下のようにサーバーのビルドと起動のスクリプトを定義します。

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

プロジェクトルートで以下のコマンドを実行し、サーバーの依存パッケージをインストールします。`@channel.io/app-sdk-server` は NestJS ベースのパッケージです。この実習では HTTP アダプターに `@nestjs/platform-express` を使います。

```sh
pnpm --dir server add @channel.io/app-sdk-server@0.46.0 @nestjs/common@11 @nestjs/core@11 @nestjs/platform-express@11 reflect-metadata zod@^4.6.7
pnpm --dir server add -D typescript@5 @types/node@24
```

`server/tsconfig.json` を作成し、以下のように記述します。サーバーのコードは `server/src` に書きます。TypeScript がコンパイルした JavaScript は `server/dist` に出力します。

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

### ping 関数を作成する

`server/src/ping.function.ts` を作成し、以下のように記述します。`ping` は入力なしで呼び出せます。戻り値の `message` は `pong` です。`@Func` で関数名を宣言し、`@InputSchema` と `@OutputSchema` で入出力を定義します。 `description` には関数を使う場面と返す値を書きます。ALF や CoS は説明を見て使う関数を選び、入力スキーマを見て渡す値を決めます。

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

`server/src/index.ts` を作成し、以下のように記述します。このファイルで SDK モジュールを設定し、`providers` に `PingFunctions` を登録します。 Express アダプターのメソッドを使えるように、アプリの型に `NestExpressApplication` を指定します。

TypeScript の `NodeNext` 設定では、実行時のファイル名でインポートします。`ping.function.ts` をコンパイルすると `ping.function.js` になるので、`./ping.function.js` を指定します。

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

App Store は `PUT /functions/v1` にリクエストを送ります。NestJS は `rawBody: true` でリクエスト本文の元のバイト列を保持します。SDK の `SignatureGuard` はその本文と Signing Key を使って `x-signature` の署名を検証します。

`ping` をバージョン付きで呼び出すと、App Store は `PUT /functions/v1` に次のようなリクエストを送ります。本文の `systemVersion` は省略できます。

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

SDK は `method` に対応する `@Func` を探し、`params` を `@Input()` に、`context` を `@Ctx()` に渡します。このリクエストには `{"result":{"message":"pong"}}` が返ります。関数が `FunctionCallError` をスローすると、レスポンス本文に `error` が入ります。

### ngrok でサーバーを公開する

App Store からローカルサーバーに接続するための HTTPS URL を割り当てます。ngrok の認証トークンを設定していない場合は、最初のコマンドを実行します。別のターミナルで `ngrok http 3000` を実行し、起動したままにします。

```sh
ngrok config add-authtoken YOUR_NGROK_AUTHTOKEN
ngrok http 3000
```

ngrok を再起動して HTTPS アドレスが変わったら、開発者ポータルの Function Endpoint を更新します。WAM Endpoint を設定した後は、両方の Endpoint を更新します。

### Function Endpoint を設定する

`Forwarding` に表示された HTTPS URL に `/functions` を付け、開発者ポータルの **Function Endpoint** に保存します。例は `https://YOUR-NGROK-DOMAIN/functions` です。App Store がバージョンを指定して呼び出す場合、`/v1` が付きます。

### アプリサーバーを登録する

プロジェクトルートでビルドし、サーバーを起動します。`pnpm --dir server start` は `server/.env` を読み込みます。`autoRegister: true` を設定しているので、起動すると次の順序でアプリ関数を登録します。

1. SDK は App Secret を使い、App Store からアプリトークンを取得します。
2. SDK はアプリトークンで、関数一覧を公開する Extension `core:v1` を登録します。
3. App Store は Function Endpoint に署名付きの `extension.core.function.getFunctions` リクエストを送信し、関数一覧を取得します。
4. SDK は `@Func` で宣言した関数の名前と入出力スキーマを返します。

```sh
pnpm --dir server build
pnpm --dir server start
```

### 開発者ツールで実際のリクエストを確認する

1. サーバーログに `Successfully registered extension: core` が表示されたら、テスト用チャネルの **App Store** で **주문 관리 시스템** を検索し、インストールします。
2. アプリの詳細で **開発者ツール** を選びます。
3. **関数** タブで `ping` を選び、**実行** を押します。**実行結果** に `{"message":"pong"}` が表示されます。

関数を呼び出したら、サーバーのターミナルで `ctx` の内容を確認します。次の出力例には、呼び出し元の `caller` とチャネルの `channel` が含まれます。

```text
ping function call {
  ctx: {
    caller: { type: 'manager', id: 'example-manager-id' },
    channel: { id: 'example-channel-id' }
  },
  input: {}
}
```

`ctx.caller.type` は呼び出し元を表します。`manager` は担当者、`user` は顧客、`system` は自動化などのシステム、`app` はアプリです。`ctx.channel.id` はリクエストの対象チャネルを表します。

## 2. 注文照会の関数を追加する

同じアプリにサンプル注文を管理するサービスと注文照会の関数を追加します。

`server/src/orders.service.ts` を作成し、次のコードを追加します。`OrderService` はサンプル注文をチャネルごとにメモリに保存します。`order-1` は発送済み、後でキャンセルできる `order-2` と `order-3` は `pending` から始まります。サーバーを再起動すると、注文は初期状態に戻ります。

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

**チャネル単位の認可**

アプリは複数のチャネルにインストールできます。この例では、リクエストのコンテキストにある `ctx.channel.id` でチャネルごとに注文を分けています。実際に注文を照会またはキャンセルする場合は、呼び出し元がそのチャネルで操作する権限を持っているかも確認してください。

`server/src/orders.function.ts` を作成し、以下のように記述します。`OrderFunctions` はリクエストのチャネル ID を使って、`OrderService` で注文を照会します。注文が見つからない場合、`OrderService` は `NotFoundError` をスローし、`OrderFunctions` が SDK の `FunctionCallError` に変換します。

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

`server/src/index.ts` に以下の import を追加し、`@Module` の `providers` に `OrderService` と `OrderFunctions` を追加します。

```ts
// server/src/index.ts (add imports)
import { OrderFunctions } from "./orders.function.js";
import { OrderService } from "./orders.service.js";
```

```ts
// server/src/index.ts (AppModule providers)
providers: [PingFunctions, OrderService, OrderFunctions],
```

`Ctrl+C` でサーバーを停止し、以下のコマンドでビルドして起動し直します。

```sh
pnpm --dir server build
pnpm --dir server start
```

App Store が関数一覧を更新したら、開発者ツールで `getStatus` を選びます。詳細には関数の正式名 `orders.getStatus` が表示されます。`orderId` に `order-1` を入力し、**実行** を押します。応答が `shipped` であることと、サーバーのターミナルに以下のログが出ることを確認します。

```text
orders.getStatus function call {
  ctx: {
    caller: { type: 'manager', id: 'example-manager-id' },
    channel: { id: 'example-channel-id' }
  },
  input: { orderId: 'order-1' }
}
```

関数が表示されない場合は、サーバーを起動したまま `core:v1` の登録結果と Function Endpoint を確認します。**実行** が無効な場合は、現在のチャネルにアプリをインストールしたか、必須項目を入力したかを確認します。

## 3. Command Extension を登録して WAM を開く

コマンドを使うと、チャット中にアプリの機能を実行できます。チームチャットのメッセージ入力欄に `/` を入力すると、コマンド一覧が開きます。

Command Extension でコマンド名と呼び出すアプリ関数を指定すると、アプリにコマンドを追加できます。このステップでは `command:v1` を登録し、`/cancel-order` で注文のキャンセル画面を開きます。

1. App Store は `extension.command.metadata.getCommands` を呼び出して、`/cancel-order` の設定を取得します。
2. チームチャットでコマンドを実行すると、App Store は `actionFunctionName` に指定した `commands.orders.cancel` を呼び出します。`systemVersion: "v1"` なので、リクエストは `PUT /functions/v1` に届きます。
3. アクション関数は `type: "wam"`、WAM を識別する `name`、画面に渡す `wamArgs` を返します。
4. チャネルトークのクライアントは、登録した WAM Endpoint に `name` を付けた URL から画面を読み込みます。

### アプリサーバーに Command を追加する

`server/src/command.extension.ts` を作成し、以下のように記述します。`CommandExtension` はコマンドを定義し、`CommandActions` の `commands.orders.cancel` は WAM を開きます。

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

SDK は `@Extension` 内の関数名に `extension.<name>.` を付けます。`metadata.getCommands` は `extension.command.metadata.getCommands` として登録されます。`CommandActions` のように Extension の外で宣言した関数には、`@Func` に書いた名前をそのまま使います。開発者ツールでは `orders.getStatus` が `orders` グループの `getStatus` として表示されます。

| 設定                     | この実習での役割                                                                                            |
| ------------------------ | ----------------------------------------------------------------------------------------------------------- |
| `scope: "desk"`          | デスク側にコマンドを表示します。`front` は顧客向けのメッセンジャー用です。                                  |
| `alfMode: "disable"`     | ALF がこのコマンドをおすすめする機能を無効にします。ステップ 5 では別の関数 `orders.getStatus` を使います。 |
| `enabledByDefault: true` | アプリのインストール時にコマンドを有効にします。                                                            |
| `paramDefinitions`       | コマンドの入力欄に表示する項目と型を定義します。ここでは注文 ID を必須にします。                            |
| `systemVersion: "v1"`    | アクションのリクエストを Function Endpoint の `/v1` パスに送ります。                                        |

コマンドの実行リクエストには `chat` や `language` などの情報も含まれる場合があります。App Store は入力欄の値を `input` の中にまとめるので、アクション関数では `input.input.orderId` で注文 ID を取得します。 [Command Extension ガイド](extensions/command.md)

`commands.orders.cancel` が返す `name` は、WAM Endpoint の末尾に追加するパスです。後ほど WAM を React で実装し、`useWamData("orderId")` で `wamArgs` の注文 ID を取得して画面に表示します。

別の WAM を実装するときは、アクションの `name` に新しい WAM 名を指定します。WAM ごとにソースを `wam/<name>` に置き、ビルドした静的ファイルを `/wam/<name>/` で配信します。

`server/src/index.ts` に以下の import を追加し、`@Module` の `providers` に `CommandExtension` と `CommandActions` を追加します。

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

### WAM をビルドし、サーバーから配信する

プロジェクトルートの `pnpm-workspace.yaml` の内容を以下のように置き換えます。`wam/*` を追加すると、WAM ごとに個別のワークスペースパッケージとして管理できます。

```yaml
packages:
  - server
  - "wam/*"

allowBuilds:
  esbuild: true
  protobufjs: false
```

`esbuild: true` を指定すると、Vite が使う `esbuild` のインストールスクリプトを実行できます。

プロジェクトルートで以下のコマンドを実行します。Vite の React と TypeScript のテンプレートで `wam/order-cancel` を作り、WAM SDK をインストールします。テンプレートが生成した `package.json`、TypeScript、ESLint の設定を使います。

```sh
pnpm create vite@7 wam/order-cancel --template react-ts --no-interactive
pnpm --dir wam/order-cancel add @channel.io/app-sdk-wam
```

`wam/order-cancel/vite.config.ts` を以下のように変更します。`base: "./"` を指定すると、ビルドした HTML が JavaScript などの静的ファイルを `/wam/order-cancel/` からの相対パスで読み込みます。

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

`wam/order-cancel/src/main.tsx` と `wam/order-cancel/src/App.tsx` の内容を、それぞれ以下のコードに置き換えます。

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

`server/src/index.ts` の先頭に次の import を追加します。

```ts
// server/src/index.ts (add import)
import { resolve } from "node:path";
```

同じファイルで `await app.listen(3000)` の直前に以下のコードを追加します。サーバーはビルドした `index.js` と同じ階層の `static/` ディレクトリを `/wam` で配信します。

```ts
// server/src/index.ts (before app.listen(...))
app.useStaticAssets(resolve(import.meta.dirname, "static"), {
  prefix: "/wam",
});
```

ngrok の `Forwarding` に表示された HTTPS URL に `/wam` を付けます。開発者ポータルで **주문 관리 시스템** の **サーバー設定**を開き、**WAM Endpoint** にこの URL を入力して **保存** を選びます。例は `https://YOUR-NGROK-DOMAIN/wam` です。

App Store はこの URL に `name` の値である `order-cancel` を追加し、アプリサーバーに `GET /wam/order-cancel/` を送信します。

サーバーを停止します。プロジェクトルートでサーバーと WAM を個別にビルドし、サーバーを起動し直します。

```sh
pnpm --dir server build
pnpm --dir wam/order-cancel build
pnpm --dir server start
```

WAM のビルド結果は `server/dist/static/order-cancel/` に出力されます。

サーバーログで `command` の登録を確認します。チャネル設定の **App Store** で **주문 관리 시스템** を開き、**コマンド** タブを選びます。**デスクコマンド** に `/cancel-order` が表示されたら、スイッチがオフの場合はオンにします。

テスト用チャネルのチームチャットの入力欄に `/` を入力し、`/cancel-order` を選びます。注文 ID に `order-2` を入力して実行し、WAM に **Order order-2** が表示されることを確認します。

コマンドが表示されない場合は、`command` の登録ログとアプリのインストール状況を確認します。画面が開かない場合は、WAM Endpoint を確認し、`http://127.0.0.1:3000/wam/order-cancel/` でページが開くか確認します。

## 4. 注文をキャンセルして担当者に通知する

`orders.getStatus` は注文の状態を取得します。次に、状態を変更する関数 `orders.cancel` を追加します。開発者ツールから直接呼び出すか、`/cancel-order` で開いた WAM で実行できます。担当者が注文を初めてキャンセルしたときに、`ctx` から担当者 ID を取得し、Native Function で通知します。

### キャンセルできる注文を決める

`server/src/orders.service.ts` を以下のコードに置き換えます。`pending` の注文だけをキャンセルできます。キャンセル済みの注文には `false` を返します。

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

### キャンセル関数から通知する

ここまでは、チャネルトークが App Store を経由してアプリ関数を呼び出しました。通知を送るときは、アプリサーバーが App Store を経由してチャネルトークの Native Function `announce` を呼び出します。通知先のチャネルのトークンを使います。

開発者ポータルの **認証と権限** で **Channel** ロールに `announce` を追加し、保存します。

`server/src/alert.service.ts` を作成し、以下のように記述します。`AlertService` は `ChannelAppModule` が提供する `TokenManager` からチャネルトークンを取得し、`announce` を呼び出します。指定した担当者の **自分とのチャットルーム** に通知を送ります。

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

SDK の `getChannelToken()` は、デフォルトでチャネルごとにトークンをメモリにキャッシュします。キャッシュしたトークンを再利用し、有効期限が近い場合は呼び出し時に更新します。

`server/src/orders.function.ts` を以下のコードに置き換えます。照会関数に加えて `orders.cancel` を定義し、コンストラクターで `AlertService` を受け取ります。`ctx.channel.id` で特定したチャネルの注文をキャンセルします。担当者が初めてキャンセルした場合は、その担当者に通知します。

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

`notification` は送信に成功したら `sent`、失敗したら `failed` を返します。担当者 ID がない場合やキャンセル済みの注文には `skipped` を返します。通知に失敗しても注文はキャンセル済みのままです。

### WAM でキャンセルを確定する

`wam/order-cancel/src/App.tsx` を次のコードで置き換えます。WAM はコマンドから受け取った注文 ID を表示し、**Confirm cancellation** を押すと `useCallFunction` で `orders.cancel` を呼び出します。

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

最後に `server/src/index.ts` を以下のコードに置き換えます。`providers` に `AlertService` を追加し、ここまでに設定した署名検証と WAM の静的ファイル配信を組み込みます。

WAM の `useCallFunction` には関数のバージョンを指定するオプションがありません。App Store はこの呼び出しを `PUT /functions` に送ることがあり、SDK のコントローラーは `PUT /functions/:version` を受け付けます。以下のミドルウェアは NestJS のルーティングやガードより先に実行され、バージョンがないリクエストのパスだけを `/functions/v1` に変えます。どちらのパスでも SDK の `SignatureGuard` が元のリクエスト本文を使って署名を検証します。

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

### 開発者ツールと Command で確認する

サーバーを停止します。プロジェクトルートでサーバーと WAM を個別にビルドし直し、サーバーを起動します。

```sh
pnpm --dir server build
pnpm --dir wam/order-cancel build
pnpm --dir server start
```

1. アプリの **開発者ツール** で `orders.cancel` を選び、`order-2` で実行します。`status: "cancelled"` と `notification: "sent"` が返ることを確認します。チームチャットの一覧で自分の名前を選び、**自分とのチャットルーム** に `Order order-2 was cancelled.` が届くことを確認します。
2. 同じテスト用チャネルのチームチャットで `/cancel-order` を選び、`order-3` を入力します。WAM で注文 ID を確認して **Confirm cancellation** を押します。**自分とのチャットルーム** に `Order order-3 was cancelled.` が届くことを確認します。
3. 開発者ツールで `orders.getStatus` を `order-3` で実行し、`cancelled` が返ることを確認します。同じ注文のキャンセル関数をもう一度実行すると `notification: "skipped"` が返ります。

## 5. CoS と ALF で注文を照会する

サーバーと ngrok を起動したまま、同じテスト用チャネルで CoS と ALF から `orders.getStatus` を試します。

- **CoS から呼び出す。** インストールしたアプリが関数を CoS に公開している場合は、左側のメニューで **AI CoS** を開き、「注文管理アプリで order-1 の配送状況を確認して」と依頼します。 [CoS ガイド](https://docs.channel.io/help/ja/articles/CoS-a8e86305)
- **ALF タスクで使う。** **AI → 設定 → タスク** からテスト用タスクを開きます。**AIエージェント** ステップの指示文に `@` を入力し、インストールしたアプリから `orders.getStatus` を追加します。`orderId` に `order-1` を渡して、返された `status` を案内するよう指示し、**プレビュー**で試します。 [ALF タスクガイド](https://docs.channel.io/help/ja/articles/%E3%82%BF%E3%82%B9%E3%82%AF-2a16be8b)
- **ALF プロシージャで使う。** プロシージャを使えるテスト用チャネルで、**顧客 → サポート → ALF → 設定 → プロシージャ**から編集画面を開きます。指示文の **アプリ** ツールで `orders.getStatus` を追加し、注文 ID を確認したら関数を呼び出すよう指示します。**プレビュー**で `order-1` を照会します。 [ALF プロシージャガイド（韓国語）](https://docs.channel.io/help/ko/articles/%ED%94%84%EB%A1%9C%EC%8B%9C%EC%A0%80Beta-6d520d9d)

どの方法でも、注文の状態が `shipped` になり、サーバーログに `orders.getStatus function call` が出ることを確認します。一般的な CoS のアプリ呼び出しは、チームメンバーの ID があると `manager` になります。ALF タスクでは、担当者のプレビューなら `manager`、顧客情報がある場合は `user`、どちらの情報もない場合は `system` になることがあります。実際の呼び出しはサーバーログの `ctx.caller.type` で確認できます。

## 次のステップ

アプリ関数を登録し、コマンドで WAM を開いて注文をキャンセルしました。Native Function で通知を送り、同じ照会関数を CoS と ALF でも使いました。実習が終わったら、サーバーと ngrok を停止します。

- [アプリの基本概念](concepts.md)でリクエストの方向と認証を確認します。
- [関数ガイド](functions.md)で関数名、スキーマ、リクエストとレスポンスを確認します。
- [WAM ガイド](wam.md)と [Extension ガイド](extensions.md)で追加する画面や機能を探します。
- [アプリ開発と運用](app-development.md)で本番環境に必要な準備を確認します。
- 既存の TypeScript や Go のサンプルを動かすには、[従来の Quickstart](quickstart-legacy.md)を参照します。
