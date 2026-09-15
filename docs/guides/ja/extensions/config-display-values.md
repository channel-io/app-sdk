# 設定画面に取得した値を表示

`config.display.load` は、アプリが取得した値を設定画面の読み取り専用フィールドに表示します。
連携した店舗名、ドメイン、注文数など、ユーザーが確認する情報を表示する場合に使います。
既存の Config フィールドを定義し、値を取得するアプリの Function を hook に指定します。

このガイドは TypeScript と NestJS を使用します。Config の基本構造は
[Config Extension](config.md) を確認してください。

## データの流れと保存先

店舗名を表示する場合、データは次のように流れます。

1. アプリの `metadata.getConfigSchema` が `storeName` フィールドと hook を返します。
2. 標準設定画面が hook に指定されたアプリの Function を呼び出します。
3. Function がアプリの DB または外部 API から店舗名を取得します。
4. アプリが `{ displayValues: { storeName: "サンプル店舗" } }` を返します。
5. 設定画面がフィールド名と値の型を検証し、`storeName` フィールドに表示します。

| データ                       | 保存先・保持場所               | 用途                                             |
| ---------------------------- | ------------------------------ | ------------------------------------------------ |
| フィールド定義と hook        | アプリが返す Config スキーマ   | 画面の構成と呼び出す Function の指定             |
| 元の店舗名                   | アプリの DB または外部サービス | アプリの Function が参照するデータ               |
| 取得した表示値               | 現在の設定画面のメモリ         | 読み取り専用フィールドへの表示                   |
| ユーザーが保存した通常の設定 | AppStore の Config 保存領域    | 以降の Function 呼び出しで `ctx.config` に渡す値 |

表示値は Config の保存リクエスト、変更の有無の判定、`ctx.config` に含めません。
画面を開き直すと、アプリの Function を呼び出して値を取得します。
表示値だけが変わっても保存ボタンは有効になりません。
表示専用フィールドしかない場合、標準の保存ボタンは表示しません。

## 利用前の確認

AppStore サーバーと標準設定画面の両方が `config.display.load` に対応している必要があります。
アプリの SDK を更新するだけでは利用できません。サーバーと画面の対応を確認してから
hook を登録してください。以前のサーバーは新しい hook を受け付けません。

2026年9月15日時点では、SDK の `GetConfigSchemaOutputSchema` は `hooks` を従来のオブジェクト形式で
定義しており、フィールドの `readOnly` プロパティを定義していません。以下の例では、新しい hook 配列と
フィールドのプロパティを保持するため、Config スキーマのレスポンスに
`z.record(z.string(), z.unknown())` を使います。既存の SDK スキーマで新しいレスポンスをパースすると、
hook 配列を拒否したり、フィールドのプロパティを削除したりする場合があります。

この方法でも、AppStore が Config スキーマを検証します。表示用 Function のレスポンスは別の
`OutputSchema` で構造を検証し、標準設定画面が Config フィールドごとに値の型を検証します。

## TypeScript の実装

### 1. フィールドと hook を定義

次のコードをアプリサーバーの `config.extension.ts` に追加してください。
既存の Config Extension がある場合は、そのクラスのスキーマにフィールドと hook を追加します。

```ts
import { Extension, Func, OutputSchema } from "@channel.io/app-sdk-server";
import { z } from "zod";

@Extension({ name: "config", systemVersion: "v1" })
export class ConfigExtension {
  @Func("metadata.getConfigSchema")
  @OutputSchema(z.record(z.string(), z.unknown()))
  getConfigSchema() {
    return {
      schemaVersion: "v1",
      configScope: "channel",
      supportsMultiple: false,
      providerName: "サンプル店舗",
      hooks: [
        {
          type: "config.display.load",
          actionFunctionName: "commerce.config.getDisplayValues",
        },
      ],
      blocks: [
        {
          type: "text",
          key: "storeName",
          label: "店舗名",
          readOnly: true,
          storageClass: "transient",
          overviewSummary: true,
        },
        {
          type: "number",
          key: "orderCount",
          label: "注文数",
          readOnly: true,
          storageClass: "transient",
        },
        {
          type: "switch",
          key: "active",
          label: "店舗営業中",
          readOnly: true,
          storageClass: "transient",
        },
      ],
    };
  }
}
```

`readOnly: true` はユーザーによる編集を禁止し、`storageClass: "transient"` は値を保存しないことを
指定します。両方のプロパティが必要です。従来の `readonly: true` 表記にも対応しています。

hook は、呼び出すタイミングと Function 名を結び付ける設定です。
`config.display.load` は決められた hook 名で、`commerce.config.getDisplayValues` はアプリが選ぶ
Function 名です。名前に `commerce` を使っても、Commerce Extension の登録は必要ありません。
既存の hook がある場合は、配列内に残してください。
特定の Function バージョンを呼び出す場合は、hook に `systemVersion` を指定します。
省略すると、既存のアプリバージョン選択ルールを使います。

### 2. 表示値を返す Function を実装

次のコードを `config-display.functions.ts` に追加してください。
動作確認用に固定値を返す例です。実際のアプリでは、アプリの DB または外部 API から値を取得します。

```ts
import { Injectable } from "@nestjs/common";
import {
  Ctx,
  Func,
  Input,
  InputSchema,
  OutputSchema,
  type Context,
} from "@channel.io/app-sdk-server";
import { z } from "zod";

const DisplayInputSchema = z.object({ key: z.string().optional() }).strict();
const DisplayOutputSchema = z.object({ displayValues: z.record(z.string(), z.unknown()) }).strict();

@Injectable()
export class ConfigDisplayFunctions {
  @Func("commerce.config.getDisplayValues")
  @InputSchema(DisplayInputSchema)
  @OutputSchema(DisplayOutputSchema)
  getDisplayValues(@Ctx() ctx: Context, @Input() _params: z.infer<typeof DisplayInputSchema>) {
    if (!ctx.channel?.id) {
      throw new Error("Channel context is required");
    }

    // 実際の取得では、ctx.channel.id に属するデータだけを返します。
    return {
      displayValues: {
        storeName: "サンプル店舗",
        orderCount: 0,
        active: false,
      },
    };
  }
}
```

このクラスは `@Extension` を付けず、通常のアプリ Function として登録します。
`@Func` の文字列を、先ほど指定した `actionFunctionName` と一致させてください。
`display` という SDK 組み込み関数を実装する方式ではありません。

レスポンスの最上位プロパティは `displayValues` のみです。内部のキーは Config の `field.key` と
完全に一致させます。グループ内のフィールドも同じです。`store.name` のようにドットを含むキーは
`{ "store.name": "サンプル店舗" }` として返します。
Function の出力スキーマにフィールドごとのスキーマを重複して定義する必要はありません。

### 3. NestJS にクラスを登録

既存の `ChannelAppModule` 設定を維持し、モジュールの `providers` に両方のクラスを追加してください。

```ts
import { Module } from "@nestjs/common";
import { ConfigExtension } from "./config.extension";
import { ConfigDisplayFunctions } from "./config-display.functions";

@Module({
  providers: [ConfigExtension, ConfigDisplayFunctions],
})
export class ConfigModule {}
```

アプリのルートモジュールで、この `ConfigModule` を import します。
`ChannelAppModule.forRoot({ ..., autoRegister: true })` を使うアプリでは、SDK がクラスを検出し、
Config Extension と通常の Function を登録します。関数サーバー、リクエストの署名検証、認証設定は
[Extension 登録ガイド](../extensions.md) に従って維持してください。

## Function に渡す値

| 設定方式           | 呼び出すタイミング                               | `params`                        | 保存済みの値の参照先       |
| ------------------ | ------------------------------------------------ | ------------------------------- | -------------------------- |
| 単一設定           | 画面を開いたとき。保存済み設定がなくても呼び出す | `{}`                            | `ctx.config`               |
| 複数設定           | 保存済みの項目を開いたとき                       | `{ "key": "saved-config-key" }` | `ctx.config?.[params.key]` |
| 複数設定の新規項目 | 保存前は呼び出さない                             | なし                            | なし                       |

`supportsMultiple: true` で複数設定を利用できます。新規項目の保存後は、返された設定キーで動的な
選択肢を取得し、同じキーで表示用 Function を呼び出します。複数設定の通常の Function は、項目が
1つでも `ctx.config` をキーと値のマップとして受け取ります。
`ctx.config.storeName` のように単一設定の構造で読み取らないようにしてください。

保存済み設定がない場合や、外部データの取得に必要な値がまだ揃っていない場合の処理は、アプリの
Function で決めます。初回連携前など、想定どおりの空の状態では `{ displayValues: {} }` を返せます。
以前の表示値を消す場合は、そのキーに `null` を返してください。
プラットフォームが Function に必要な入力値やデフォルト値を自動で補うことはありません。

### チャネルとマネージャーのスコープ

`configScope: "channel"` と `configScope: "manager"` の両方に対応しています。
表示用 Function の `params` に `scope`、`channelId`、`managerId` は追加しません。

- チャネル ID は、認証済みの `ctx.channel.id` から取得します。
- マネージャー設定は、`ctx.caller.type === "manager"` のとき、`ctx.caller.id` が示す本人の設定です。
- マネージャースコープの Function は、マネージャーの context がなければエラーを返す必要があります。
- 複数設定のキーでアプリの DB や外部データを参照する場合は、対象のチャネルとマネージャーに
  属するデータかを確認します。キー自体をアクセス権限の根拠にしないでください。

マネージャースコープでは、データを取得する前に次の条件を確認してください。

```ts
if (ctx.caller?.type !== "manager" || !ctx.caller.id) {
  throw new Error("Manager context is required");
}
const managerId = ctx.caller.id;
```

表示用 Function はデータの取得に使います。呼び出し中に設定を保存したり、外部データを変更したりしません。

## レスポンスのルール

`readOnly + transient` の条件を満たす、機密情報を含まないフィールドだけを返します。
通常の保存フィールド、credential、password、`sensitive: true`、`resolvesTo` があるフィールドは
許可されません。

| フィールドの型       | 許可する値                                                                                                                       |
| -------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| `text`, `textarea`   | 文字列                                                                                                                           |
| `number`             | 有限の数値                                                                                                                       |
| `switch`, `checkbox` | `true` または `false`                                                                                                            |
| `select`, `radio`    | 現在の選択肢の `value` または空文字列                                                                                            |
| `multiselect`        | 現在の選択肢の `value` で構成する配列                                                                                            |
| `phone`              | 文字列の `countryCode` と `number` を持つオブジェクト                                                                            |
| `address`            | 文字列の `name`、`zipcode`、`address1`、`address2` と、`phone` 構造の `cellphone` を持つオブジェクト                             |
| `image`              | `name`、`size`、`contentType` と、`dataUrl`・`url`・`previewUrl` のいずれかを持つオブジェクト。`multiple: true` の場合はその配列 |

画像の `name`、`contentType`、URL の値は文字列、`size` は0以上の有限の数値です。
上記のフィールドはすべて `null` で空にできます。それ以外のフィールド型には対応していません。

| レスポンス                                                    | 画面の処理                                         |
| ------------------------------------------------------------- | -------------------------------------------------- |
| `{ "displayValues": {} }`                                     | 同じ対象について以前に取得した、有効な表示値を維持 |
| `{ "displayValues": { "storeName": null } }`                  | 店舗名を空にする。`defaultValue` は再適用しない    |
| `{ "displayValues": { "orderCount": 0, "active": false } }`   | `0` と `false` をそのまま表示                      |
| `{ "displayValues": { "storeName": "" } }`                    | 空文字列を適用                                     |
| `{}` または `{ "displayValues": null }`                       | レスポンス形式のエラー                             |
| 未定義のキー、不正な型、保存フィールドを1つでも含むレスポンス | レスポンス全体を拒否                               |

省略したキーは、現在のフィールド定義で有効な以前の表示値を維持します。
`null` はフィールドを空の状態にします。スイッチとチェックボックスは `false`、複数選択は `[]` になります。

動的な選択肢は、`choicesSource.type: "function"` で既存の選択肢用 Function に接続します。
設定画面は初回の選択肢取得を終えてから表示値を検証します。たとえば選択肢に
`{ label: "基本プラン", value: "basic" }` がある場合、表示用 Function は `"basic"` を返します。
以前の選択値が新しい選択肢に含まれなくなった場合は、その値を空にします。

## 再取得とエラー処理

設定画面を開いたとき、既存設定の再読み込み時、連携完了後の更新時、表示値の取得を再試行するときに
呼び出します。入力値を編集するたびには呼び出しません。

- hook を省略すると、表示用 Function を呼び出さず、既存の Config の動作を維持します。
- hook を登録していても、対象の Function が存在しない場合や呼び出しに失敗した場合は、
  エラーバナーと再試行の操作を表示します。
- 同じ対象の取得に失敗した場合は、最後に取得できた値を維持します。
- 表示値の再試行や OAuth 連携完了後の更新では、編集中の通常の設定値を維持します。
- 別の設定に移動した後や、画面を閉じた後に届いたレスポンスは適用しません。

表示値を取得できても、設定の検証や連携が完了したことにはなりません。
連携状態は、既存の Config 検証と OAuth の状態から判定します。

### サマリー画面での表示範囲

単一設定の保存済み連携サマリーには、フィールドの `overviewSummary: true` で値を表示できます。
2026年9月15日時点では、複数設定の詳細画面で表示値を確認できますが、一覧カードは保存済みの値だけを
使うため、この hook の値は表示できません。一覧カードへの表示が必要なデータは、この機能だけでは
表示できません。

## 動作確認

アプリの登録後、標準設定画面で次の項目を確認してください。

1. 単一設定を未保存の状態で開くと、`{}` で呼び出し、店舗名・注文数 `0`・スイッチ `false` を表示する。
2. 表示フィールドを編集できず、表示値の取得だけでは保存ボタンが有効にならない。
3. 通常の保存フィールドがあるアプリでは、保存後の `ctx.config` に表示値が含まれない。
4. 空の `displayValues` は以前の値を維持し、`null` は対象フィールドを空にする。
5. 未定義のキーや不正な型を返すと、値を一部だけ適用せず、エラーを表示する。
6. 取得失敗後に再試行しても、編集中の通常の設定値を維持する。
7. 複数設定では保存前の呼び出しを省略し、保存後に選択したキーを渡す。
8. マネージャースコープでは認証済みマネージャーのデータだけを取得し、マネージャーの context がない要求を拒否する。
