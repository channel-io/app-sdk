# `userAuthorization` Extension 利用ガイド

`userAuthorization` は、機密性の高い app Function を実行する前に、現在の Channel User が
request に含まれる識別子を使用できるか AppStore に確認させる Extension です。対応する識別子は
携帯電話番号（`phone`）、メールアドレス（`email`）、会員 ID（`memberId`）です。

たとえば ALF が `orders.cancel` を call すると、次の順序で処理します。

```text
ALF が注文キャンセル Function を call
  → AppStore が Function の本人確認設定を取得
  → input から携帯電話番号・メールアドレス・会員 ID を取得
  → 本人確認に失敗: app Function を call しない
  → 本人確認に成功: app Function を call
  → app server が注文の所有者とキャンセル可能な状態を最終確認
  → すべての business condition を満たす場合のみ注文をキャンセル
```

AppStore の本人確認は、建物の入口で身元を確認する手続きに似ています。app server は建物内の
窓口として、その人が本当に注文や account の所有者なのかをもう一度確認する必要があります。
入口を通過しても、他の人の注文を変更できるわけではありません。

> [!IMPORTANT]
> 現在、AppStore は `invokeSource` が `alfTask` で、caller が trusted User の ALF Task call
> にだけ `userAuthorization` を適用します。Command、Widget、CustomTab、一般 Function call、
> Manager・System call、legacy direct ALF call はこの policy を bypass します。これらの surface
> にも本人確認が必要な場合は、app 側の保護手順を維持してください。

## AppStore と app server の責任

### AppStore が確認すること

対応する call で保護設定が ON の場合、AppStore は次を処理します。

- registration 時に discovery した正確な Function name で policy を検索します。
- Channel manager が保存した Function ごとの ON/OFF 設定を適用します。
- ALF call の trusted User と app に渡す `context.user` が一致するか確認します。
- `phone` と `email` では、同じ Channel、同じ User、同じ識別子に有効な本人確認 proof があるか
  確認します。
- `memberId` では、現在の Core User の `memberId` と request value をそのまま比較します。
- 確認に失敗すると、OAuth、API key、Config などの credential を取得したり app Function を
  call したりする前に request を拒否します。
- `phone` または `email` の proof がない場合は OTP 送信を 1 回試み、受付に成功したときだけ
  caller が本人確認を続けるための情報を返します。

対応する ALF Task User call で Function の保護設定が ON になっており、app Function が実際に
call された場合、その request で宣言した識別子は AppStore の本人確認を通過しています。

### app 開発者が引き続き確認すること

`userAuthorization` は app の business authorization までは判断しません。app server は次を
直接処理する必要があります。

- request した User が対象の注文・予約・account・document の所有者か確認します。
- 注文状態、返金可能期間、role、plan など、操作に必要な条件を確認します。
- AppStore が確認した識別子と app storage の所有者識別子を比較します。
- mutation を transaction、conditional update、idempotency key で保護します。
- Function request の AppStore signature を検証した後にだけ `context` を信頼します。
- 識別子、OTP、token、credential を通常の log や error message に残しません。

`member-42` が現在の User の正しい `memberId` であれば、次の 2 つの request はどちらも
AppStore の `memberId` 確認を通過できます。

```json
{
  "orderId": "my-order",
  "authorization": { "type": "memberId", "value": "member-42" }
}
```

```json
{
  "orderId": "another-users-order",
  "authorization": { "type": "memberId", "value": "member-42" }
}
```

AppStore が確認するのは、`member-42` が現在の User の会員 ID であることです。
`another-users-order` が `member-42` の注文かどうかは app server だけが判断できます。この所有者
確認を省略すると、別の User の注文を変更できる問題が発生します。

## 始める前に

- TypeScript SDK `@channel.io/app-sdk-server` `0.21.0` 以降を使用します。
- 保護する Function が ALF Task から User の代わりに call される Function か確認します。
- Function input で識別子 type と value を受け取る string field を決めます。
- `phone` または `email` を使う場合、caller 側の ALF flow が OTP input と元 request の retry
  に対応しているか確認します。この flow が準備できるまでは production 設定を ON にしません。
- 最初は `enabledByDefault: false` で登録し、test Channel で先に有効にすることを推奨します。

SDK はまだ `userAuthorization` metadata 専用 schema を export していません。app で Zod schema
と metadata Function を定義してください。

```bash
pnpm add @channel.io/app-sdk-server@^0.21.0 zod
```

## TypeScript で実装する

### 1. 保護する Function input を設計する

識別子 type と value を Function input に明示します。次の例は携帯電話番号、メールアドレス、
会員 ID に対応します。

```ts
import { Injectable } from "@nestjs/common";
import { z } from "zod";
import type { Context } from "@channel.io/app-sdk-server";
import {
  Ctx,
  Func,
  Input,
  InputSchema,
  OutputSchema,
} from "@channel.io/app-sdk-server";

export const CancelOrderInputSchema = z
  .object({
    orderId: z.string().min(1),
    authorization: z
      .object({
        type: z.enum(["phone", "email", "memberId"]),
        value: z.string().min(1),
      })
      .strict(),
  })
  .strict();

const CancelOrderOutputSchema = z
  .object({
    cancelled: z.boolean(),
  })
  .strict();

@Injectable()
export class OrderFunctions {
  constructor(private readonly orders: OrdersService) {}

  @Func("orders.cancel")
  @InputSchema(CancelOrderInputSchema)
  @OutputSchema(CancelOrderOutputSchema)
  async cancelOrder(
    @Ctx() ctx: Context,
    @Input() input: z.infer<typeof CancelOrderInputSchema>,
  ) {
    const canCancel = await this.orders.canCancel({
      channelId: ctx.channel.id,
      orderId: input.orderId,
      identifierType: input.authorization.type,
      identifierValue: input.authorization.value,
    });

    if (!canCancel) {
      throw new Error("The caller cannot cancel this order");
    }

    await this.orders.cancel(input.orderId);
    return { cancelled: true };
  }
}
```

1 種類の識別子だけに対応する Function では選択肢を絞れます。携帯電話番号だけを受け取る場合は
次のように宣言します。

```ts
const PhoneAuthorizationSchema = z.object({
  type: z.enum(["phone"]),
  value: z.string().min(1),
});
```

AppStore が schema から Function input UI を作ると、`type` には携帯電話番号だけが表示されます。

### 2. metadata Function を実装する

`userAuthorization` の metadata Function は、保護する Function と識別子を読み取る path を
AppStore に通知します。

```ts
import { z } from "zod";
import {
  Extension,
  Func,
  InputSchema,
  OutputSchema,
} from "@channel.io/app-sdk-server";

const DescriptionSchema = z
  .object({
    description: z.string().min(1),
  })
  .strict();

const PathSchema = z
  .object({
    path: z.string().min(1),
  })
  .strict();

const UserAuthorizationFunctionSchema = z
  .object({
    functionName: z.string().min(1),
    enabledByDefault: z.boolean().optional(),
    description: z.string().optional(),
    i18nMap: z
      .object({
        ko: DescriptionSchema.optional(),
        en: DescriptionSchema.optional(),
        ja: DescriptionSchema.optional(),
      })
      .strict()
      .optional(),
    identifier: z
      .object({
        type: PathSchema,
        value: PathSchema,
      })
      .strict(),
  })
  .strict();

const UserAuthorizationConfigSchema = z
  .object({
    functions: z.array(UserAuthorizationFunctionSchema).optional(),
  })
  .strict();

@Extension({ name: "userAuthorization", systemVersion: "v1" })
export class UserAuthorizationExtension {
  @Func("metadata.getConfig")
  @InputSchema(z.object({}).strict())
  @OutputSchema(UserAuthorizationConfigSchema)
  getConfig(): z.infer<typeof UserAuthorizationConfigSchema> {
    return {
      functions: [
        {
          functionName: "orders.cancel",
          enabledByDefault: false,
          description: "注文者の本人確認後に注文をキャンセルします。",
          i18nMap: {
            ko: {
              description: "주문자 본인 확인 후 주문을 취소합니다.",
            },
            en: {
              description:
                "Cancel an order after verifying the customer identifier.",
            },
          },
          identifier: {
            type: { path: "authorization.type" },
            value: { path: "authorization.value" },
          },
        },
      ],
    };
  }
}
```

SDK discovery が公開する metadata Function の full name は次のとおりです。

```text
extension.userAuthorization.metadata.getConfig
```

#### Metadata field

| Field                   | 役割                                                                                                       |
| ----------------------- | ---------------------------------------------------------------------------------------------------------- |
| `functions`             | app 全体の現在の保護 policy snapshot。省略するか空配列を返すと、保護する Function がないことを意味します。 |
| `functionName`          | Discovery に公開した保護対象 Function の正確な full name。                                                 |
| `identifier.type.path`  | Function input から `phone`、`email`、`memberId` のいずれかを読む path。                                   |
| `identifier.value.path` | 確認する識別子 string を読む path。                                                                        |
| `enabledByDefault`      | Channel ごとの初期設定。省略すると `true`。                                                                |
| `description`           | 設定画面に表示する default description。                                                                   |
| `i18nMap`               | `ko`、`en`、`ja` ごとの description。                                                                      |

`functions` は一部を変更する patch ではなく、app 全体の完全な policy snapshot です。再登録時に
以前の snapshot にあった Function を外すと、その policy と Channel 設定も削除されます。

同じ `functionName` を複数入れる、discovery にない Function を宣言する、2 つの identifier path
を同じ値にすると、registration 全体が失敗します。AppStore は不正な snapshot の一部を保存せず、
最後に正常登録した snapshot を維持します。

### 3. Provider と自動登録を設定する

2 つの class を NestJS module の `providers` に追加します。Provider にない class は SDK が
discovery できません。

```ts
import { Module } from "@nestjs/common";
import { ChannelAppModule } from "@channel.io/app-sdk-server";

@Module({
  imports: [
    ChannelAppModule.forRoot({
      appId: process.env.APP_ID!,
      appSecret: process.env.APP_SECRET!,
      signingKey: process.env.SIGNING_KEY!,
      autoRegister: true,
    }),
  ],
  providers: [OrderFunctions, UserAuthorizationExtension],
})
export class AppModule {}
```

開発環境と single instance app では自動登録を使用できます。複数 instance を rolling deployment
する production 環境では、すべての instance の `getFunctions` と `getConfig` response が同じに
なってから registration を 1 回実行してください。異なる release が同時に response する間に
登録すると、古い metadata が最新 snapshot として保存される可能性があります。

登録を制御する場合は app token を取得し、
`nativeClient.registerExtension(appId, "userAuthorization", "v1", appToken.accessToken)` を call
します。Function Endpoint が外部 request に応答できる状態になってから登録してください。

### 4. Channel で保護設定を ON にする

app を Channel に install して registration が完了すると、AppStore の設定画面に Function ごとの
toggle が表示されます。AppStore は実際の値を次の順序で決めます。

```text
Channel に保存した ON/OFF 値がある
  → 保存した値を使用

Channel に保存した値がない
  → enabledByDefault を使用
```

`enabledByDefault` を省略すると `true` です。新しい policy を登録した時点で既存の install
Channel でもすぐに保護が ON になる可能性があります。最初の rollout では `false` を明示し、
管理された test Channel で先に有効にすることを推奨します。

設定が OFF の場合も、app の resource authorization を省略してはいけません。app server の
所有者確認と状態確認は常に同じ基準で実行してください。

## Metadata 作成ルール

### Function name を正確に一致させる

`functionName` は SDK discovery の canonical Function name と完全に一致する必要があります。

```text
Discovery: extension.orders.cancel
Metadata:  extension.orders.cancel  ✅
Metadata:  orders.cancel            ❌
Metadata:  Extension.Orders.Cancel  ❌
```

AppStore は whitespace の trim、case 変換、prefix の追加・削除、alias 解決を行いません。
`userAuthorization` を登録した app の対応 ALF User call で catalog にない name を使うと、保護対象
でなくても `-32601` を返します。

### Path は string field を参照する

Path は dot で区切った JSON object path です。各 path の最後の field は Function input schema
で string である必要があります。

```json
{
  "authorization": {
    "type": "phone",
    "value": "01012345678"
  }
}
```

この input には次の path を使用します。

```json
{
  "identifier": {
    "type": { "path": "authorization.type" },
    "value": { "path": "authorization.value" }
  }
}
```

AppStore は似た key を探したり array を探索したりしません。registration 時に discovery schema
で両方の path を検証し、runtime でも同じ path から string を読みます。

### Metadata に Function version を追加しない

policy identity は次の 2 つです。

```text
(appId, canonicalFunctionName)
```

`systemVersion: "v1"` は `userAuthorization` metadata contract の version であり、保護対象
Function の version ではありません。Metadata に `targetSystemVersion` や Function ごとの
`systemVersion` を追加しないでください。同じ canonical Function は versioned route と
unversioned route で同じ policy を使います。不要になった version field を入れると AppStore が
registration を拒否します。

## 識別子ごとの保証範囲

| Type       | AppStore が確認すること                                                 | app server が追加確認すること                            |
| ---------- | ----------------------------------------------------------------------- | -------------------------------------------------------- |
| `phone`    | 同じ Channel と User がその携帯電話番号で作成した有効な本人確認 proof   | その番号が注文・予約・account に保存した番号と一致するか |
| `email`    | 同じ Channel と User がそのメールアドレスで作成した有効な本人確認 proof | そのアドレスが app account や対象 resource と一致するか  |
| `memberId` | 現在の Core User の `memberId` と request string の exact match         | その `memberId` が対象 resource の所有者か               |

携帯電話番号とメールアドレスの proof は永続的な所有権証明ではありません。proof は期限切れに
なることがあり、電話番号の再割り当てや account 情報の変更もあり得ます。操作のリスクに合わせて
追加確認や変更制限を適用してください。

proof identity に app ID は含まれません。同じ Channel の同じ User が同じ識別子で本人確認を
完了していれば、別 app の保護 Function でも有効な proof を再利用できます。

personal-auth app は携帯電話番号とメールアドレスを正規化して proof を検索しますが、保護対象
Function には元の `params` が渡されます。app storage の値と比較するときは、app の保存規則に
合わせて両方を同じ形式に正規化してください。

`memberId` は whitespace の trim、case 変換、alias 解決を行わず、そのまま比較します。app
storage でも同じ identity を使ってください。

## Runtime の処理結果

対応する ALF Task User call は次のように処理します。

| 状態                                                  | 結果                                                  |
| ----------------------------------------------------- | ----------------------------------------------------- |
| app が `userAuthorization` を登録していない           | 元の method を call                                   |
| 登録済みだが request name が discovery catalog にない | `-32601`、app Function は未 call                      |
| Function は catalog にあるが metadata にない          | 本人確認なしで canonical Function を call             |
| 保護 metadata はあるが設定が OFF                      | 本人確認なしで canonical Function を call             |
| 保護設定 ON、識別子 input が不正                      | `-32602`、app Function は未 call                      |
| 保護設定 ON、本人確認が必要                           | `-32801`、app Function は未 call                      |
| 保護設定 ON、AppStore・Core・DB・personal-auth が失敗 | `-32000`、app Function は未 call                      |
| 保護設定 ON、本人確認に成功                           | app Function を call                                  |
| ALF Task call だが trusted User がない                | `userAuthorization` を bypass して元の method を call |
| ALF Task User 以外の call                             | `userAuthorization` を bypass して元の method を call |

policy に入った request が失敗すると、AppStore は保護対象 Function を call しません。app server
がこの error を受け取るのではなく、ALF などの Function caller が error を受け取って次の操作を
決めます。

## OTP 本人確認 flow

`phone` または `email` の proof がない場合、AppStore は personal-auth app に OTP 送信を 1 回
request し、`-32801` を返します。送信 request が受理された場合にだけ、error `data` に次の
follow-up call 情報を入れます。

```json
{
  "userAuthorization": {
    "otp": {
      "sent": true,
      "appId": "personal-auth-app-id",
      "method": "verifyCode",
      "systemVersion": "v1",
      "identifierType": "email",
      "identifier": "customer@example.com"
    }
  }
}
```

`sent: true` は送信 request が受理されたことを意味します。User の端末や inbox に届いたことまでは
保証しません。rate limit、送信失敗、`memberId` 確認失敗など、OTP で続行できない `-32801` には
この `data` がない場合があります。`identifier` は元の値を含むため、caller 側でもこの error
`data` を通常の log に残さないでください。

caller 側の ALF integration は次の手順を実装します。

1. `-32801` と `data.userAuthorization.otp` を確認します。
2. User に OTP の入力を求めます。
3. 案内された `verifyCode@v1` を同じ Channel と User context で call します。
4. 本人確認に成功したら、元の Function request をもう一度 call します。

AppStore は元の request を自動で retry しません。retry で二重キャンセルや二重返金が発生しない
ように app Function を idempotent にしてください。保護対象 app server が OTP を直接受け取る、
または personal-auth app を直接 call する必要はありません。

## Error 処理

| Code     | 意味                                             | 確認すること                                                   |
| -------- | ------------------------------------------------ | -------------------------------------------------------------- |
| `-32601` | Canonical Function が見つからない                | `functionName`、discovery、call method の exact match          |
| `-32602` | 識別子 type または value がない・不正            | Function input schema と metadata path                         |
| `-32801` | 本人確認が必要・失敗                             | OTP follow-up 情報があれば本人確認を続け、なければ再確認を案内 |
| `-32000` | AppStore、Core、DB、personal-auth の一時的な失敗 | 操作は未実行として、回数を制限して retry                       |

app Function が call された後に返す error は既存 contract を維持します。本人確認 error message に
携帯電話番号、メールアドレス、会員 ID の元の値を入れないでください。

## Deployment と再登録

policy を安全に変更するには次の順序で deployment します。

1. 新しい Function と metadata をすべての app server instance に先に deploy します。
2. すべての instance の `getFunctions` と `getConfig` response が同じか確認します。
3. `userAuthorization:v1` を 1 回登録または再登録します。
4. test Channel で Function list と description を確認します。
5. Function ごとの設定を ON にします。
6. 本人確認の成功・失敗と app の resource authorization を一緒に test します。
7. 検証が完了した後に対象 ALF traffic を開きます。

Function を追加または rename するときは、新しい name に traffic を送る前に再登録を完了します。
登録済み catalog にない新しい name は `-32601` で拒否されます。保護を一時停止するときは
Extension の登録を解除せず、Channel 設定を OFF にします。Extension の登録を解除すると
snapshot とすべての Function 設定が削除されます。

## Release 前チェックリスト

- [ ] `@channel.io/app-sdk-server` `0.21.0` 以降を使用しています。
- [ ] 保護対象が現在対応する ALF Task User call であることを確認しました。
- [ ] `functionName` が discovery の canonical name と正確に一致しています。
- [ ] `identifier.type.path` と `identifier.value.path` が input schema の string を指しています。
- [ ] `functions` が部分更新ではなく app 全体の policy snapshot です。
- [ ] 最初の rollout で `enabledByDefault: false` を明示しました。
- [ ] すべての app server instance の discovery と metadata が同じになってから登録しました。
- [ ] OFF、ON、不正 input、proof なし、本人確認成功をそれぞれ test しました。
- [ ] `phone`、`email`、`memberId` を app resource の所有者ともう一度比較します。
- [ ] Manager call と policy 適用外の surface に app 独自の authorization があります。
- [ ] mutation を transaction、conditional update、idempotency で保護しました。
- [ ] 識別子、OTP、token、credential が log や error に含まれません。

[Function 登録](../functions.md)、[Extension 完全ガイド](../extensions.md)、
[TypeScript User Authorization reference](../../../reference/typescript/extensions/user-authorization.md)、
[本番運用準備ガイド](../app-development.md)も確認してください。
