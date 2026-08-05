# Extension 完全ガイド

## Extension とは

Extension は typed app Function を Channel の標準機能に接続する、名前と version を持つ契約です。
アプリが公式 Function name と schema を実装すると、Channel の画面は command、widget、custom
tab、hook、OAuth などの機能を discovery して呼び出せます。

Extension は通常、2 種類の Function で構成されます。

| Function の種類           | 役割                                               | 例                                       |
| ------------------------- | -------------------------------------------------- | ---------------------------------------- |
| Metadata または discovery | 機能を説明し、runtime Function を指す              | `extension.command.metadata.getCommands` |
| Runtime または action     | user-facing または background operation を実行する | `extension.command.command.execute`      |

Metadata は `orders.sync` のような standalone app Function を参照することもできます。アプリ固有の
business operation は standalone にし、標準契約だけを Extension namespace に置いてください。
Extension 内の relative name は `extension.{extensionName}.{relativeName}` という full name になります。

Registration はアプリの code を upload・deploy する処理ではありません。アプリ単位の
`(extensionName, systemVersion)` 契約を AppStore に通知し、設定された Function Endpoint から
schema を discovery できるようにします。また、個別の Channel への install や機能の有効化でも
ありません。Channel install、permission grant、capability activation は別の段階です。

## 実装から discovery まで

```text
SDK decorator または builder
  → Function schema と Extension registration target
  → HTTPS server が listening を開始
  → SDK が cache 済み app token を取得
  → registerExtension(appId, extensionName, systemVersion)
  → AppStore が getFunctions と metadata Function を呼び出す
  → install 済み Channel surface が runtime Function を呼び出す
```

SDK が提供する Extension family、Function name、schema を使ってください。Metadata が action
Function を指しても、その Function が自動で作られるわけではありません。Metadata Function と
参照されるすべての runtime Function を app server に登録する必要があります。

## TypeScript の実装と自動登録

`@Extension` で family と system version を宣言し、`@Func` に relative name を指定して、decorated
class を NestJS provider として登録します。`ChannelAppModule` が provider を discovery し、HTTP
listener の準備後に推奨 registration flow を実行します。

```ts
import { Module } from "@nestjs/common";
import { z } from "zod";
import {
  ChannelAppModule,
  CommandResultSchema,
  Extension,
  Func,
  GetCommandsOutputSchema,
  InputSchema,
  OutputSchema,
} from "@channel.io/app-sdk-server";

@Extension({ name: "command", systemVersion: "v1" })
class CommandExtension {
  @Func("metadata.getCommands")
  @InputSchema(z.object({}))
  @OutputSchema(GetCommandsOutputSchema)
  getCommands() {
    return {
      commands: [
        {
          name: "hello",
          scope: "desk",
          actionFunctionName: "extension.command.command.open",
          alfMode: "disable",
          enabledByDefault: true,
        },
      ],
    };
  }

  @Func("command.open")
  @InputSchema(z.object({}).passthrough())
  @OutputSchema(CommandResultSchema)
  open() {
    return { type: "text", attributes: { message: "Hello" } };
  }
}

@Module({
  imports: [
    ChannelAppModule.forRoot({
      appId: process.env.APP_ID!,
      appSecret: process.env.APP_SECRET!,
      signingKey: process.env.SIGNING_KEY!,
      autoRegister: true,
    }),
  ],
  providers: [CommandExtension],
})
export class AppModule {}
```

Class が `providers` に含まれていないと discovery できません。`autoRegister` が false でも実装済み
Function は SDK が dispatch しますが、その Extension registration target は AppStore に公開されません。

## Go の実装と自動登録

Typed `extension/{family}` builder と `app.Use` を使います。Builder が Function schema と Extension
registration target の両方を宣言します。`server.WithAutoRegister()` は server が discovery request
へ応答できるようになってから registration を開始します。

```go
app := appsdk.New(appsdk.Options{
  AppID:     os.Getenv("APP_ID"),
  AppSecret: os.Getenv("APP_SECRET"),
})

if err := app.Use(command.Extension().
  GetCommands(command.StaticCommands(&command.Config{
    Name:               "meeting",
    Scope:              command.ScopeDesk,
    ActionFunctionName: "commands.meeting.execute",
    AlfMode:            command.AlfModeDisable,
  })).
  Execute("commands.meeting.execute", executeMeeting),
); err != nil {
  log.Fatal(err)
}

if err := server.Run(
  app,
  server.WithSignature(os.Getenv("SIGNING_KEY")),
  server.WithAutoRegister(),
); err != nil {
  log.Fatal(err)
}
```

Deployment policy で custom retry や observability が必要な場合は
`server.WithAutoRegisterRetry` と `server.WithAutoRegisterResult` を使います。既存 Gin server では
`server/gin` の同等 option を使います。

## `registerExtension` が行うこと

推奨される自動登録 flow は次のとおりです。

1. Function server が listening するまで待ちます。
2. `TokenManager` から cache 済みの **app token** を 1 つ取得します。
3. Discovery された各 Extension name と system version で `registerExtension` を呼び出します。
4. 一時的な失敗を bounded exponential backoff で retry します。
5. AppStore が versioned Function Endpoint から schema と metadata を discovery できるようにします。

Request field は camelCase の `appId`、`extensionName`、`systemVersion` です。`v1` などの
`systemVersion` は Channel Extension contract version であり、アプリの release version ではありません。

Custom bootstrap や deployment system が registration を管理する場合にだけ native Function を
直接呼び出します。

| SDK        | 直接呼び出す場合                                                                                 |
| ---------- | ------------------------------------------------------------------------------------------------ |
| TypeScript | `nativeClient.registerExtension(appId, extensionName, systemVersion, appToken.accessToken)`      |
| Go         | `nativeClient.RegisterExtension(ctx, appToken.AccessToken, appID, extensionName, systemVersion)` |

Function request ごとに新しい token を発行したり、registration を実行したりしないでください。
Standalone Function だけのアプリは SDK の `core:v1` fallback を使います。ALF task、Notebook、
Messaging などの advanced family は generic Extension registration の後に secondary sync または
product setup が必要な場合があるため、family recipe に従ってください。

## Registration lifecycle と検証

- AppStore は registration 直後に discovery を呼び出す可能性があるため、Function Endpoint を先に
  deploy します。
- 通常の startup では自動登録を有効にし、custom infinite loop ではなく SDK の bounded retry を
  使います。
- 複数 replica を deploy する場合は shared token storage を使います。重複する idempotent
  registration call は許容できますが、各 replica が cache なしで token 発行 loop を持つべきではありません。
- Extension schema、metadata、Function name、permission、Function Endpoint を変更したら再登録します。
  単なる app release のために `systemVersion` を変更しないでください。
- Capability を意図的に削除する場合だけ `unregisterExtension` を使います。Deployment rollback は
  最後の compatible server と schema を復元する必要があります。

次の境界を個別に検証してください。

1. Startup log に期待する Extension name、system version、registration success が表示されます。
2. `getFunctions` discovery にすべての metadata と参照先 runtime Function が含まれます。
3. Install と activation の後、意図した Channel surface に metadata が表示されます。
4. Test Channel で実際の runtime call が 1 つ成功します。
5. 不正 input・signature、permission 不足、一時的な registration failure が設計どおり拒否または
   retry されます。

`registerExtension` の成功が証明するのは registration request が受理されたことだけです。
Discovery、metadata validation、Channel install・activation、runtime handler の動作までは証明しません。

## Extension family を選ぶ

すべての Extension を次の順序で実装します。

1. Function が実際に使う最小限の permission だけを有効にします。
2. SDK schema で metadata Function と参照先 Function を実装します。
3. App token を使う SDK 自動登録を適用します。
4. Discovery、正常 call、不正 input、権限不足、retry を test します。
5. App Secret、Signing Key、app/channel token、provider credential を WAM に入れません。

TypeScript は通常 `@Extension` と `@Func` を使います。Go は
`extension/{family}` typed builder を優先してください。以下の各 family recipe は両言語の実装、
認証、WAM、信頼性、test を説明し、正確な TypeScript schema と
[Go Extension reference](../../reference/go/EXTENSIONS.md) へ案内します。

最初に [Function 登録](functions.md)で共通 wire contract を確認し、UI を開く Extension には
[WAM ガイド](wam.md)も適用してください。

## Config

`config` は API key、`client_credentials`、shop identifier、scope ごとの設定に使います。
`extension.config.metadata.getConfigSchema` を実装し、必要に応じて validation/save/delete
Function を追加します。Secret field は credential として扱い、安定した key ではなく label
だけを翻訳してください。注入された値は Function context から読み、WAM に渡しません。

[Config 詳細](extensions/config.md)

## OAuth

`oauth` は外部 provider の Authorization Code flow にだけ使います。
`extension.oauth.metadata.getAuthConfig` を実装して `oauth:v1` を登録します。Redirect state と
connection は AppStore が管理し、provider token は `ctx.authToken` に注入されます。API key と
`client_credentials` は OAuth ではなく Config に保存します。

[OAuth 詳細](extensions/oauth.md)

## Command

`extension.command.metadata.getCommands` が Desk command を公開します。各 command は standalone
または Extension Function の正確な full name を参照する必要があります。Command は text を
返す、action を実行する、または WAM を開けます。Command discovery と action handler を別々に
test してください。

[Command 詳細](extensions/command.md) · [WAM ガイド](wam.md) ·
[TypeScript tutorial](https://github.com/channel-io/app-tutorial-ts) ·
[Go tutorial](https://github.com/channel-io/app-tutorial)

## Widget

`extension.widget.metadata.getWidgets` が context ごとの widget を公開します。Metadata は surface
と action Function を選び、action は WAM を開けます。Chat、user、manager context は surface
によって存在しないため optional として扱い、native action の permission を確認します。

[Widget 詳細](extensions/widget.md)

## Custom tab

`extension.customtab.metadata.getCustomTabs` が app-owned tab を公開します。Tab identifier を安定
させ、action には正確な Function name を指定し、interactive content は WAM で提供します。
Metadata と `wamArgs` に token や private record を入れません。

[Custom tab 詳細](extensions/customtab.md)

## Hook

`extension.hook.metadata.getHooks` が event-driven Function を宣言します。Handler を idempotent
にし、署名済み app Function request だけを処理し、非同期処理できる event には速く response
します。公開 `webhook.received` target には public `targetId` が必要です。App scope は高 entropy
の `endpointToken` を使い、manager scope は Function context で AppStore 発行 URL を受け取ります。
両 scope とも provider payload validation と replay protection が必要です。

[Hook 詳細](extensions/hook.md)

## Polling

`extension.polling.metadata.getPollers` が scheduled poller を宣言します。Scope ごとの resolver が
channel target（`target.getChannels`）または channel/manager target（`target.getManagers`）を page
単位で返し、各 poller は呼び出す full Function name を指定します。Cursor を永続化し、retry を
idempotent にし、batch size と実行時間を制限して partial failure を test してください。

[Polling 詳細](extensions/polling.md)

## Calendar

`calendar` は calendar/event type、availability、booking の作成・取消・変更・照会に使います。
Provider credential は server に置き、time zone を明示的に正規化し、booking mutation を
idempotent にします。Slot 選択 UI は WAM、provider call は server Function が担当します。

[Calendar 詳細](extensions/calendar.md)

## Store

`extension.store.metadata.getStoreProfile` が store identity と presentation metadata を公開します。
AppStore は registration/sync 時に profile を読みます。安定した ID と翻訳 label を分離し、
provider credential を profile に含めません。

[Store 詳細](extensions/store.md)

## DataSource

DataSource metadata は catalog、table、column、table description を提供します。Query は通常の
app Function route ではなく、認証済み DataSource gRPC endpoint で実行します。
`x-access-token` を検証し、catalog/table allowlist、parameterized SQL、row/time limit を適用し、
Arrow-compatible result を stream してください。SDK は PostgreSQL と BigQuery 向け runner を
提供します。

[DataSource 詳細](extensions/datasource.md) ·
[Go example](../../reference/go/EXTENSIONS.md#datasource-extension-and-query-server)

## Commerce

新しい commerce app は redesigned `commerce` Extension を使います。ID-based order model、
buyer、order lookup、cancel/return/exchange request、exchangeable item、shipping address change、
structured `ActionResult` を提供します。Mutation 前に provider state を検証し、provider が
対応しない operation は明確な unsupported result にしてください。

[Commerce 詳細](extensions/commerce.md)

## WMS

`wms` は warehouse/order-management provider を接続します。Order lookup、
cancel/return/exchange restore flow、shipping-address change には ID-based
`extension.wms.order.*` Function を使います。Shop config を明示的に要求し、mutation は安全な
環境で rollback 可能性まで test してください。

[WMS 詳細](extensions/wms.md)

## Messaging

Messaging は inbox、prebuilt messaging、follow-up、medium-link、CHX integration を含みます。
他の family より AppStore contract への依存が強く、generic registration と複数の
channel-scoped native Function を使います。必要な native claim を先に設計し、外部
conversation/message mapping を保存し、webhook/polling delivery を idempotent にします。
正しい user/manager authorization なしで user を代行してはいけません。

[Messaging 詳細](extensions/messaging.md)

## ALF task

`extension.alfTask.alftask.getTasks` が versioned automation task を公開します。Registration は
`registerExtension("alfTask", "v1")` と `registerAlfTasks` の 2 段階です。Task key を安定させ、
behavior change では version を上げ、sync 済み version を確認してください。

[ALF task 詳細](extensions/alf-task.md)

## Notebook

`extension.notebook.core.getNotebooks` が versioned notebook definition を公開し、registration 後に
`registerAppNotebooks` sync が必要です。Notebook/cell key を安定させ、definition change では
version を上げ、外部 data を render するときは untrusted input として扱います。

[Notebook 詳細](extensions/notebook.md)

## Mail relay

`mailRelay` は `extension.mailRelay.inbound.onMailReceived` で normalized mail event を受けます。
TypeScript `0.17.2` では full name を standalone `@Func` として登録し、
`registerExtension("mailRelay", "v1")` を明示的に呼びます。Go には typed builder があります。
Relay token を検証し、attachment/body size を制限し、message ID を deduplicate し、raw mail
content を log に残しません。

[Mail relay 詳細](extensions/mail-relay.md)

## 検証 checklist

- Metadata が SDK schema と正確な full Function name を使います。
- Extension provider または Go builder が一度だけ登録されます。
- Signature がない、または不正な Function request を reject します。
- App/channel token を cache/refresh し、manager/user authorization は WAM host に任せます。
- Provider credential は Config/OAuth から注入し、client に返しません。
- Mutation は idempotent または安全に retry でき、permission failure が明確です。
- Install 済み test app で discovery と real invocation を一度以上通します。

実装の検証後は、[本番運用準備ガイド](app-development.md)を security、reliability、deployment、
operation、rollback の最終 gate として使ってください。
