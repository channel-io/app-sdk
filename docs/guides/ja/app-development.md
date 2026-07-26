# アプリ開発ガイド

この文書は [first-app Quickstart](./quickstart.md) の次に必要な設計、security、deployment、
operation の判断を説明します。正確な API は
[TypeScript reference](../../reference/typescript/README.md) と
[Go reference](../../reference/go/README.md) を確認してください。完全な実装は
[TypeScript tutorial](https://github.com/channel-io/app-tutorial-ts) と
[Go tutorial](https://github.com/channel-io/app-tutorial) にあります。

## 1. Capability boundary を設計する

User task から始め、その task を公開する最小の Extension family を選びます。Extension は
version 付き capability と metadata/runtime Function を公開します。Standalone Function は
Extension や WAM から参照できる typed RPC です。WAM は Channel 内で動く任意の React UI
です。Business rule と privileged provider call は server に置きます。

実装前に次を決めます。

- user action と対応する Channel surface
- Extension family と必要な Function
- input/output schema と安定した error type
- app scope / channel scope の Native Function permission
- WAM が必要かどうか
- idempotency、retry、timeout、provider rate limit

[Concepts](./concepts.md)、[Functions](./functions.md)、
[Command ガイド](./extensions/command.md)、[WAM ガイド](./wam.md)、
[Extension guide](./extensions.md) も確認してください。

## 2. Trust zone を分離する

三つの領域を明確に分けます。

1. **Channel host:** 現在の manager を認証し、WAM context を提供します。
2. **WAM:** host data を検証して表示し、狭い app/native action を要求します。
3. **App server:** signed Function request を検証し、credential を保管し、scope に合う token で
   provider と Channel operation を呼び、business authorization を適用します。

App Secret、Signing Key、refresh token、provider credential を WAM に置かないでください。
WAM argument は untrusted input として schema validation します。Privileged target を渡す場合、
server が短時間だけ有効な target を署名し、戻った request の channel/caller identity を再確認します。

## 3. Authentication と permission

すべての inbound Function request を raw body と Signing Key で検証します。独自 HMAC ではなく
SDK signature middleware/guard を使用します。Signature bypass は明示的な local test のみに
限定します。

Token cache と refresh は `TokenManager` に任せます。

- app token: Extension registration と app-owned operation
- channel token: install された一つの Channel での server-side operation
- host-authorized native call: WAM から現在の manager が実行する action

必要最小限の permission だけを要求します。有効な token は business authorization の代わりには
なりません。言語別の authentication / Native Function reference を確認してください。

## 4. 一つの vertical slice を完成させる

Family を増やす前に、一つの user-visible flow を最後まで実装します。

1. shared schema
2. Function handler と Extension metadata
3. signature verification と auto-registration
4. 必要な場合だけ WAM
5. typed Native Function または provider call 一つ
6. unit test と installed-app test

TypeScript は主に NestJS decorator と Zod、Go は builder、struct、typed handler を使います。
Go server でも同じ React WAM package を提供できます。

## 5. Endpoint と deployment

個別 Function/WAM name ではなく HTTPS root を設定します。

| Setting           | Example root                           |
| ----------------- | -------------------------------------- |
| Function Endpoint | `https://app.example.com/functions`    |
| WAM Endpoint      | `https://app.example.com/resource/wam` |

Function と WAM route は安定した root の下に置き、health check は分離します。Traffic を受ける前に
schema/migration を準備し、Extension auto-registration を安全に retry できるようにします。
Multiple instance では shared token storage と registration race を確認してください。

## 6. Test と operation

四つの level で検証します。

- schema と pure business rule
- Function discovery、error、signature、token scope
- server/WAM build と endpoint routing
- test Channel に install した private app の success、permission denial、retry

Operation name、request ID、latency、stable error type を記録します。Message body、token、
credential、customer/provider data は log に残しません。Signature failure、registration failure、
token refresh error、provider throttling、Function latency に alert を設定します。

Release 前に rollback、secret rotation、token cache、permission change、fresh process での登録と
実際の app flow を確認します。

## 次の文書

- [Command ガイド](./extensions/command.md)
- [WAM ガイド](./wam.md)
- [Extension recipes](./extensions.md)
- [TypeScript reference map](../../reference/typescript/README.md)
- [Go reference map](../../reference/go/README.md)
- [Cross-language protocol](../../reference/protocol.md)
