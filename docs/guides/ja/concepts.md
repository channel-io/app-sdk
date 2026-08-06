# 基本概念

Channel アプリは、**Function を実行するサーバー**と、必要に応じて **WAM として作る Web UI** で構成されます。Extension は関連する Function を Channel の標準機能に接続し、AppStore は呼び出し・登録・権限の境界を担当します。

```text
Channel client → AppStore → 署名付き PUT /functions/v1 → SDK の検証・dispatch → Function handler
Function result → WAM を開く → WAM SDK → app Function または Channel native function
```

## Function

Function は app server で実行される 1 つの型付き operation です。Call request には次の値が含まれます。

- `method`: 呼び出す Function の完全な名前
- `params`: caller から受け取る未信頼の input
- `context`: AppStore が構成した caller、channel、language、authentication、config の情報

Handler は通常、検証済みの `context` と `params` を受け取って `result` を返し、失敗時は structured `error` を返します。`context` は request の `x-signature` 検証に成功した場合だけ信頼してください。

TypeScript では `@Func`、`@InputSchema`、`@OutputSchema`、`@Ctx`、`@Input` を使います。SDK は Zod schema を JSON Schema として公開し、実行時にも input/output を検証します。Go では `appsdk.Register` または `appsdk.MustRegister` が Go struct から schema を生成し、typed handler を登録します。

Function には 2 種類あります。

- **Extension Function**: 標準 Extension に属する Function。たとえば command の `metadata.getCommands` は `extension.command.metadata.getCommands` として公開されます。
- **Standalone Function**: `tutorial.open` や `orders.sync` のような app 固有の business operation。TypeScript では `@Extension` のない provider に `@Func` を定義し、Go では `appsdk.Register` を使います。

AppStore は `extension.core.function.getFunctions` を通じて Function name と input/output schema を discovery します。SDK が discovery response、`PUT /functions/:version` route、dispatch、validation を処理するため、新規 app で raw JSON-RPC router を作る必要はありません。

## Extension

Extension は、関連する Function と metadata を Channel の機能として宣言する **name と system version を持つ capability contract** です。単なる folder や class の分類ではありません。AppStore は登録された contract を使って command の表示、widget/custom tab の起動、hook の配信、OAuth/config flow の接続を行います。

代表的な Extension は command、widget、custom tab、hook、OAuth、config、calendar、polling、commerce、order、WMS、messaging です。各 Extension には標準 Function name と schema があります。最初に [Extension 完全ガイド](extensions.md) を読み、[TypeScript Extension reference](../../reference/typescript/EXTENSIONS.md) と各言語の typed helper を確認してください。

現在推奨する TypeScript の書き方は次のとおりです。

```ts
@Extension({ name: "command", systemVersion: "v1" })
export class CommandExtension {
  @Func("metadata.getCommands")
  getCommands() {
    /* ... */
  }
}
```

`@Extension` は SDK がサポートする公式 Extension name にだけ使います。App 固有 Function をまとめるための偽の Extension は作らず、standalone `@Func` を使ってください。Decorated class は discovery のため NestJS module の `providers` にも登録する必要があります。

Go では `extension/command`、`extension/oauth`、`extension/config` などの typed builder を優先します。標準 helper がない Function は `appsdk.Register` で登録し、独立した Extension contract が本当に必要な場合だけ generic builder を使います。

Auto-registration は app token で `registerExtension(appId, extensionName, systemVersion)` を呼び出します。その後 AppStore が Function Endpoint の discovery Function を呼び、metadata と schema を読み取ります。Registration の成功だけでは handler の動作は保証されないため、discovery と実際の Function call を別々に test してください。

## Schema と Context

Input schema は未信頼の `params` を制限し、output schema は app の返り値が AppStore contract に合うか検証します。標準 Extension では SDK が export する schema を再利用してください。同名 DTO を独自に作ると contract の変更を見落としやすくなります。

Call surface に応じて `context` には次の値が含まれる場合があります。

- `caller`: `user`、`manager`、`system`、`app` のいずれかの actor
- `channel`: app が install されている Channel の識別情報
- `user`、`userChat`、`language`: その flow で提供される場合の user context
- `authToken`: OAuth connection 用に AppStore が復号して注入した provider access token
- `config`: config Extension で保存した現在 scope の設定と credential
- `webhooks`: Hook `targetId` ごとの AppStore 発行 manager callback URL

Optional field が常に存在するとは考えず、Function の実行 surface に合わせて検証してください。`ctx.authToken` は Channel App の app/channel token ではなく、外部 OAuth provider の token です。

## WAM

WAM（Web App Module）は Channel client 内で開く app の Web UI です。Command、widget、custom tab などの Function が次のような action result を返すと、client は登録済み WAM Endpoint 配下の `{name}` UI を load します。

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

Build 済み SPA は `${WAM_ENDPOINT}/${name}` で serve し、React root を `WamProvider` で wrap します。

- `useWamData` / `useTypedWamData`: `appId`、`channelId`、`managerId`、chat context、`wamArgs` を読む
- `useCallFunction`: AppStore を経由して自分の app Function を呼ぶ
- `useNativeFunction`: 現在の surface と manager/user authorization で許可された Channel native function を呼ぶ
- `useWamSize`、`useWamClose`: WAM の size と close を制御する

React setup、runtime data、Function call、resize、close の完全な流れは [WAM ガイド](wam.md)を
確認してください。

WAM は `App Secret`、`Signing Key`、app token、channel token を保存・発行しません。`wamArgs` も client から読めるため、secret、access token、生の customer data を入れないでください。App または bot として行う処理は `useCallFunction` で app server に依頼し、server が channel token を使うようにします。現在の manager/user が行う処理だけを `useNativeFunction` で呼び出してください。

## Authentication、Signature、Token

次の credential を区別してください。

| 値                         | 意味                                                               | 保存場所                                  |
| -------------------------- | ------------------------------------------------------------------ | ----------------------------------------- |
| App ID                     | App の公開識別子                                                   | Server と WAM で使用可能                  |
| App Secret                 | app/channel token pair の発行に使う長期 secret                     | Server secret manager のみ                |
| Signing Key                | AppStore からの Function request の `x-signature` を検証           | Server secret manager のみ                |
| App token                  | Extension registration と app-scoped native operation              | Server cache                              |
| Channel token              | Install 済み Channel で server が実行する channel-scoped operation | Channel ごとに分離した server cache       |
| Manager/User authorization | 現在の Channel client user が実行する native operation             | WAM host runtime が管理                   |
| Provider OAuth token       | 接続済み外部 service API の呼び出し                                | 必要時に `ctx.authToken` へ注入           |
| Config credential          | API key、`client_credentials`、shop ごとの secret など             | AppStore が保存し `ctx.config` などへ注入 |

受信 Function の authentication と送信 native call の authentication は別です。

1. **受信 request**: hex-encoded Signing Key を使い、受信した raw request body そのものに対する HMAC-SHA256 `x-signature` を検証します。TypeScript は `SignatureGuard` と NestJS `rawBody: true`、Go は `server.WithSignature` を使います。Production では検証を無効にしないでください。
2. **Server からの送信 request**: `TokenManager` が App Secret で app token または channel token を発行して cache します。SDK は期限前に refresh し、同時の issue/refresh を deduplicate します。Request ごとに `issueToken` を呼ばないでください。
3. **WAM からの送信 request**: WAM SDK が host bridge を呼びます。Manager/User authorization は Channel runtime が判断し、app server の `TokenManager` は発行しません。

### Token 発行の詳細

Low-level 発行 API を繰り返し呼ばず、`TokenManager` を使用してください。Transport の問題を調査する
場合や token lifecycle を意図的に管理する場合は、次の contract を基準にします。

- `issueToken` と `refreshToken` は app ごとに **30分あたり10回**の制限を共有します。Request
  ごとに token を発行せず、access/refresh token pair を cache してください。
- `issueToken` で `channelId` を省略すると、Extension registration など app-scoped operation 用の
  app token が発行されます。
- Install 済み Channel の `channelId` を指定すると、その Channel の server-side operation 用の
  channel token が発行されます。App の install と選択した permission は引き続き必要です。
- 主要な result field は `accessToken`、`refreshToken`、秒単位の `expiresIn` です。Native
  Function request では現在の access token を `x-access-token` header に渡します。
- Channel permission は server が channel token で実行する operation を制限します。
  Manager/User permission と authorization は WAM host が現在の user と surface から適用します。

正確な API と custom cache storage は
[TypeScript authentication/token reference](../../reference/typescript/AUTH-AND-TOKENS.md)と
[Go authentication/token reference](../../reference/go/AUTH-AND-TOKENS.md)を確認してください。

Default token cache は単一 process 向けの in-memory storage です。複数 replica では SDK の cache interface を Redis や database などの shared storage で実装し、token pair を共有してください。In-flight deduplication は process-local なので、replica 間の refresh を厳密に調整する必要がある場合は storage-side lock も実装します。Access token、refresh token、provider token、credential を log に残さないでください。

OAuth Authorization Code flow には OAuth Extension と `ctx.authToken` を使います。一方、`client_credentials`、API key、shop ごとの credential は user redirect 型 OAuth ではないため、Config Extension に保存して server-side で使います。

## Native Function と Endpoint

Native Function は app Function と逆方向の call です。App server または WAM が AppStore を通じて Channel の機能を実行します。

- Server: TypeScript `NativeFunctionClient` または Go `native.Client`
- Token lifecycle: TypeScript/Go の `TokenManager`
- WAM: `useNativeFunction`

すべての言語に同じ typed wrapper があると仮定せず、[Go feature parity](../../reference/go-feature-parity.md) を確認してください。Wrapper がない場合だけ protocol call を小さな transport adapter に隔離し、method と request/response contract を test します。

Developer portal には system version や WAM name を付ける前の root を登録します。

- Function Endpoint: `https://app.example.com/functions`
- 実際の Function call: `PUT https://app.example.com/functions/v1`
- WAM Endpoint: `https://app.example.com/resource/wam`
- 実際の WAM UI: `https://app.example.com/resource/wam/tutorial`

## Proto

`proto/` は TypeScript と Go が共有する wire contract の source です。App developer は通常、generated proto code ではなく各言語 SDK の decorator、builder、schema、type を使います。Document や example と public export が一致しない場合は、public export と schema implementation を優先してください。

次に [Function 登録](functions.md)、[Command ガイド](extensions/command.md)、[WAM ガイド](wam.md)、
[Extension 完全ガイド](extensions.md)、最後に [本番運用準備ガイド](app-development.md)を確認してください。
実行可能な code は [TypeScript tutorial](https://github.com/channel-io/app-tutorial-ts) と
[Go tutorial](https://github.com/channel-io/app-tutorial)を参照してください。
