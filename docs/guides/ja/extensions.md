# Extension 完全ガイド

Extension は typed app Function を Channel の標準機能に接続します。Handler を書く前に公式
Extension を選び、SDK schema と Function name を再利用してください。アプリ固有の business
Function は standalone にします。Extension registration と runtime execution は別なので、
`registerExtension` の成功だけでは metadata discovery や handler の動作確認になりません。

すべての Extension を次の順序で実装します。

1. Function が実際に使う最小限の permission だけを有効にします。
2. SDK schema で metadata Function と参照先 Function を実装します。
3. App token で Extension を一度登録します。
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
します。公開 `webhook.received` target には public `targetId`、高 entropy の `endpointToken`、
payload validation、replay protection、secret rotation が必要です。

[Hook 詳細](extensions/hook.md)

## Polling

`extension.polling.metadata.getPollers` が scheduled poller を宣言します。
`target.getChannels` のような target resolver が install 済み channel を page 単位で返し、各
poller は呼び出す full Function name を指定します。Cursor を永続化し、retry を idempotent にし、
batch size と実行時間を制限して partial failure を test してください。

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
