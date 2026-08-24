# 最初の Channel アプリを作る

このチュートリアルでは、Channel の会話で `/tutorial` を実行すると小さな画面が開き、2 つのボタンからテストメッセージを送信するアプリを作ります。初回は TypeScript の手順を推奨します。Go を使う場合は [Go を使う場合](#6-go-を使う場合) に進んでください。

完成したアプリは次のように表示されます。

![Channel クライアント内で開いた tutorial WAM](../../assets/first-app/tutorial-wam.png)

始める前に、次の 3 つの用語だけ確認してください。

- **Function**: アプリサーバーが実行する 1 つの処理です。このチュートリアルでは、画面を開く処理とメッセージを送る処理が Function です。
- **Extension**: アプリの Function を Channel の機能につなぐ設定です。ここでは `/tutorial` Command をつなぎます。
- **WAM**: Channel 内で開くアプリ画面です。このチュートリアルでは 2 つのメッセージ送信ボタンを表示します。

Function リクエストの署名検証、Extension の登録、WAM とサーバーの接続は SDK が処理するため、独自に実装する必要はありません。

## 1. 始める前の準備

次のものが必要です。

- Channel developer portal にアクセスできるアカウント
- Node.js 20.11 以上と Corepack
- Git
- ローカルサーバーを公開できる HTTPS tunnel ツール（例: [ngrok](https://ngrok.com/)）

Channel settings から App Store を開きます。**Advanced features** を展開して **Create app** を選ぶと、Channel Developer Portal が開きます。

![Channel settings から App Store を開く](../../assets/first-app/app-store-entry.png)

開発用の名前を入力し、認証方式は **Legacy token** のままにします。規約に同意してアプリを作成してください。このチュートリアルでは Legacy token の Native Function 権限を使います。

![開発用 app を作成](../../assets/first-app/create-app.png)

**完了の目安:** 作成したアプリの **Basic Information** 画面が開いたら次へ進みます。

**失敗時の最初の確認:** Advanced features または Create app が表示されない場合は、その Channel でアプリを作成する権限があるか確認してください。

## 2. アプリ情報と権限を設定する

**Basic Information** で Application ID を確認します。

![Application ID を確認](../../assets/first-app/app-id.png)

**Authentication & Permissions → Legacy token** で Secret を発行し、**Basic Information → Server Settings** で Signing Key を発行します。

![Legacy token の Secret を発行](../../assets/first-app/app-secret.png)

Application ID は公開してもよい識別子です。Secret と Signing Key はサーバーだけで使う秘密情報で、生成直後に一度だけ表示されます。安全な場所に保存し、Git、ドキュメント、WAM コード、ログに残さないでください。

**Authentication & Permissions → Legacy token** では、このチュートリアルで使う権限だけを有効にします。

- Channel: `writeGroupMessage`
- Team Member: `writeGroupMessageAsManager`

![Channel permission の writeGroupMessage を確認](../../assets/first-app/permissions.png)

![Team Member permission の writeGroupMessageAsManager を確認](../../assets/first-app/permission-team-member.png)

**完了の目安:** Application ID、Secret、Signing Key の 3 つを用意し、2 つの権限を有効にしたら次へ進みます。

**失敗時の最初の確認:** Secret や Signing Key を紛失した場合は、推測した値を使わず developer portal で再発行してください。

## 3. TypeScript チュートリアルを実行する

ターミナルでチュートリアルを取得し、環境ファイルを作成します。

```bash
git clone https://github.com/channel-io/app-tutorial-ts.git
cd app-tutorial-ts
corepack enable
cp server/.env.example server/.env
```

`server/.env` に前の手順で用意した値を入力します。

```dotenv
APP_ID=your-app-id
APP_SECRET=your-app-secret
SIGNING_KEY=your-hex-signing-key
```

依存関係をインストールし、build、test、typecheck を実行します。

```bash
corepack pnpm install --frozen-lockfile
corepack pnpm build
corepack pnpm test
corepack pnpm typecheck
```

すべて成功したらサーバーを起動します。

```bash
corepack pnpm start
```

**完了の目安:** サーバーが `3000` port で起動したことがターミナルに表示されます。このターミナルは起動したままにしてください。

**失敗時の最初の確認:** Node.js の version と最初に表示されたエラーを確認してください。署名検証を無効にしたり、失敗したコマンドを飛ばしたりしないでください。

## 4. サーバーを Channel につなぐ

別のターミナルを開き、ローカルの `3000` port を HTTPS で公開します。次は ngrok の例です。

```bash
ngrok http 3000
```

ngrok の `Forwarding` に表示された HTTPS アドレスをコピーします。以下では、このアドレスを `https://YOUR_HOST` と表します。

Developer portal の **Basic Information → Server Settings** に次の 2 つのアドレスを入力します。

| Setting           | Value                            |
| ----------------- | -------------------------------- |
| Function Endpoint | `https://YOUR_HOST/functions`    |
| WAM Endpoint      | `https://YOUR_HOST/resource/wam` |

![Function/WAM Endpoint を設定](../../assets/first-app/endpoints.png)

Function Endpoint に `/v1`、WAM Endpoint に `/tutorial` を追加しないでください。保存後、アプリサーバーを一度再起動します。

**完了の目安:** サーバーログで Extension 登録と Function 一覧の取得がそれぞれ成功したことを確認します。`/tutorial` Command の情報がエラーなく検証されたら次へ進みます。

**失敗時の最初の確認:** Application ID、Secret、tunnel アドレスを確認してください。Tunnel アドレスが変わった場合は developer portal の 2 つの Endpoint も更新します。

## 5. テスト Channel で実行する

Developer portal から private app をテスト Channel にインストールします。すでにインストール済みの場合はインストール情報を更新します。

1. Channel のグループ会話を開きます。
2. メッセージ入力欄に `/tutorial` と入力して Command を実行します。
3. WAM が開いたら、app bot ボタンと manager ボタンを順番に押します。

次のように 2 つのメッセージが届けば完了です。

![Bot と manager が送信した test message](../../assets/first-app/tutorial-result.png)

**完了の目安:** App bot からのメッセージと、現在の manager 名で送られたメッセージが 1 件ずつ表示されます。

**失敗時の最初の確認:** `/tutorial` が一覧にない場合は、サーバーログで Extension 登録、`extension.core.function.getFunctions` の取得、Command 情報の検証がそれぞれ成功したか確認し、アプリを再インストールまたは更新してください。WAM は開くものの送信できない場合は [トラブルシューティング](#8-トラブルシューティング) の権限項目を確認します。

## 6. Go を使う場合

Go を使う場合は TypeScript の代わりにこの手順を実行します。Go 1.25 と、WAM build 用の Node.js および Corepack が必要です。

```bash
git clone https://github.com/channel-io/app-tutorial.git
cd app-tutorial
corepack enable
cp .env.example .env
```

`.env` に `APP_ID`、`APP_SECRET`、`SIGNING_KEY` を入力し、現在の shell に読み込みます。

```bash
set -a
. ./.env
set +a
```

Build と test を実行してからサーバーを起動します。

```bash
make build
make test
make run
```

別のターミナルで `3022` port を公開します。

```bash
ngrok http 3022
```

TypeScript と同じく、developer portal の Function Endpoint に `https://YOUR_HOST/functions`、WAM Endpoint に `https://YOUR_HOST/resource/wam` を入力します。Go サーバーは `http://localhost:3022/ping` でも確認できます。その後は [テスト Channel で実行する](#5-テスト-channel-で実行する) と同じです。

**完了の目安:** `make test` が成功し、サーバーログに listener の開始と Extension 登録成功が表示されます。

**失敗時の最初の確認:** `make run` の直後に終了する場合は、`.env` の 3 つの値が現在の shell に読み込まれているか確認してください。

## 7. SDK が処理したこと

最初の実行が成功したら、先ほどの流れを次の 4 段階で理解できます。

1. SDK が `command:v1` Extension を登録し、Channel に `/tutorial` Command があることを伝えます。
2. Command を実行すると `tutorial.open` Function が WAM を開きます。
3. App bot ボタンはアプリサーバーの `tutorial.sendAsBot` Function を実行します。
4. Manager ボタンは WAM の `useNativeFunction` を使い、現在の manager の権限で Channel の機能を実行します。

サーバーでは、SDK が Function schema の公開、`x-signature` の検証、app/Channel token の管理を担当します。具体的には、`TokenManager` が token を再利用し、SDK が `registerExtension(appId, extensionName, systemVersion)` の呼び出しと Function discovery への応答を行います。WAM では `useCallFunction` が AppStore を経由してアプリサーバーの Function を呼び出します。

これらの内部動作を変更するときに、[基本概念](concepts.md)、[Function 登録](functions.md)、[Command ガイド](extensions/command.md)、[WAM ガイド](wam.md) を確認してください。

## 8. トラブルシューティング

| 症状                           | 最初の確認                                                               |
| ------------------------------ | ------------------------------------------------------------------------ |
| Extension 登録に失敗           | Application ID と Secret、公開 HTTPS アドレス、サーバーの再起動          |
| `401` または signature エラー  | Signing Key を元の hex 文字列のまま入力したか                            |
| `/functions/v1` が `404`       | Portal の Function Endpoint が `/functions` で終わっているか             |
| WAM が開かない                 | WAM Endpoint が `/resource/wam` で終わっているか、WAM build が成功したか |
| Manager のメッセージ送信に失敗 | `writeGroupMessageAsManager`、グループ会話、現在の manager でのログイン  |
| Bot のメッセージ送信に失敗     | `writeGroupMessage`、現在の Channel にアプリがインストール済みか         |

`SKIP_SIGNATURE_VERIFICATION=true` は隔離したローカルデバッグ以外で使わないでください。Secret、Signing Key、access/refresh token を issue やログに貼り付けないでください。

## 次に読むドキュメント

1. [基本概念](concepts.md) で Function、Extension、WAM の関係を理解します。
2. [Function 登録](functions.md) と [Command ガイド](extensions/command.md) でサーバー処理と Command を拡張します。
3. [WAM ガイド](wam.md) で画面と Function 呼び出しを拡張します。
4. [Extension 完全ガイド](extensions.md) で必要な他の機能を選びます。
5. リリース前に [本番運用準備ガイド](app-development.md) を確認します。
6. 言語別 API は [TypeScript reference](../../reference/typescript/README.md) と [Go reference](../../reference/go/README.md) で確認します。

完全な実装は [TypeScript tutorial](https://github.com/channel-io/app-tutorial-ts) または [Go tutorial](https://github.com/channel-io/app-tutorial) で確認できます。
