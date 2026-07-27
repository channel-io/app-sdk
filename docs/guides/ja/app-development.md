# 本番運用準備ガイド

Install 済みの Test Channel でアプリの end-to-end flow が動作した後に、このガイドを使ってください。
最初の app Quickstart を完了するための必須ドキュメントではありません。動作する Function、
Extension、必要に応じた WAM を、安全に deploy・rollback・observe・operate できる release にする
ことが目的です。

先に [基本概念](concepts.md)、[Extension 完全ガイド](extensions.md)、必要な family recipe を完了して
ください。正確な API は [TypeScript reference](../../reference/typescript/README.md) と
[Go reference](../../reference/go/README.md) を基準に確認します。

## このガイドの使い方

各 section を release gate として使います。アプリに該当する各項目の owner、evidence、rollback
decision を記録してください。

| Gate        | Release 前に必要な evidence                                         |
| ----------- | ------------------------------------------------------------------- |
| Contract    | Function schema、Extension discovery、permission の review 完了     |
| Security    | Signature、credential、authorization、secret rotation test の通過   |
| Reliability | Retry、idempotency、timeout、token cache、provider limit が bounded |
| Operations  | 安全な log、metric、alert、runbook、rollback の準備完了             |
| Runtime     | Install 済み private app で server と WAM build の検証完了          |

## 1. 公開 contract を確定する

- Release 前に、すべての public Function name、input/output schema、stable error type、Extension
  metadata ID、`systemVersion` を review します。
- `getFunctions` discovery にすべての metadata Function と参照先 runtime Function が含まれることを
  確認します。
- Release する各 capability について実際の call を 1 つ以上実行します。Registration success だけでは
  runtime behavior の evidence になりません。
- AppStore はすぐに discovery を呼び出す可能性があるため、registration や schema change より先に
  compatible Function Endpoint を deploy します。
- Permission 追加は product rollout として扱います。既存 install が新しい permission を受け取る、
  または承認する方法を確認してから依存してください。

標準 Extension contract に含まれない provider 固有 operation は standalone にします。このガイドで
contract description を重複させず、[Function 登録](functions.md) と
[Extension 完全ガイド](extensions.md) に従ってください。

## 2. Security と data handling の gap を閉じる

- Process startup で App ID、App Secret、Signing Key を必須として検証し、欠けている場合は fail
  closed にします。
- すべての inbound Function request で、正確な raw body に対する `x-signature` を検証します。
  Deploy 済み環境では verification を無効にしません。
- App Secret、Signing Key、refresh token、provider credential、server access token を WAM bundle、
  source map、log、analytics、`wamArgs` に入れません。
- Function input と WAM host data を検証します。有効な token や signature は、対象の Channel、
  user、manager、provider resource に対する business authorization の代わりにはなりません。
- Secret rotation の順序、overlap period、revoke、verification を文書化します。Incident が発生する
  前に secret rotation を test します。
- Customer/provider data の log retention、redaction、deletion policy を定義します。

## 3. Failure と concurrency を制限する

- Client、server、provider timeout を設定します。Function request を無期限に待たせません。
- 一時的な failure だけを bounded exponential backoff と jitter で retry します。Provider throttling と
  提供される `Retry-After` を守ります。
- Mutation に idempotency key または durable deduplication record を持たせます。Function、hook、
  polling、webhook の duplicate delivery を test します。
- 複数 replica では shared token cache storage を使います。App token rate limit を超えずに refresh
  lock と fallback token issue が動作することを確認します。
- Extension auto-registration を idempotent かつ bounded にします。複数 replica が startup 時に
  競合するため、token state を共有し、registration race が無制限の retry storm を起こさないようにします。
- Liveness と readiness を分離します。必要な schema、migration、credential、provider check が完了する
  まで traffic を受けません。
- Queue、batch size、cursor progress、WAM payload、provider response size に上限を設定します。

## 4. Release candidate を test する

4 つの layer を検証します。

1. Schema、serialization、pure business rule
2. Signature rejection、token scope、permission denial、structured Function error
3. Function discovery、Extension metadata、server/WAM build、endpoint routing
4. Test Channel に install した private app の success、denial、retry、duplicate delivery、provider
   outage、recovery flow

Production と同じ artifact と configuration shape を使います。アプリが両方の実装を support する場合、
TypeScript と Go server が同じ public contract を満たすことを確認します。Go server も TypeScript
server と同じ React WAM package を提供できます。

## 5. 安全な observability を追加する

アプリ運用に必要な field だけを記録します。

- Operation または full Function name
- Request/correlation ID
- App deployment version と Extension system version
- Latency、outcome、stable error type、retry count、provider status category

Message body、token、credential、raw Function input、customer record、provider payload、signed request
body を log に残しません。Error が log や trace に到達する前に sanitize します。

継続的な signature failure、Extension registration failure、token refresh error、provider throttling、
queue lag、Function latency/error-rate increase、繰り返す rollback condition に alert を設定します。
個別 failure ごとではなく、各 alert を owner と runbook に接続してください。

## 6. 安全に deploy・rollback する

- Database と schema migration は前後両方の app version と backward compatible にします。
  Destructive cleanup は後の release に分離します。
- 新しい Function を指す metadata より先に server を rollout します。WAM asset は immutable
  filename または検証済み cache invalidation を使います。
- Provider、permission set、Extension contract が大きく変わる場合は canary または限定 test install を
  使います。
- Function error increase、discovery failure、authorization regression、provider saturation、data
  integrity risk などの rollback trigger を定義します。
- 以前の server/WAM artifact、configuration、migration position、permission behavior を rollback 用に
  保管します。Rollback 後に registration と discovery が compatible contract へ戻ることを確認します。
- Install 済み Channel から post-deploy smoke test を実行し、release window 中に合意した metric を
  監視します。

## 7. 最終 launch checklist

- [ ] Public Function と Extension contract を review し、discovery を検証しました。
- [ ] Signature、permission、business authorization、secret rotation test が通過します。
- [ ] Token cache、registration race、idempotency、timeout、retry、provider throttling が bounded です。
- [ ] Log と trace に credential や customer/provider payload がありません。
- [ ] Alert、dashboard、owner、incident runbook があります。
- [ ] Migration、deployment order、smoke test、rollback を rehearsal しました。
- [ ] 実際の production artifact が install 済み private app で動作します。

## Reference map

- [Extension 完全ガイドと family recipe](extensions.md)
- [Function 登録](functions.md)
- [WAM ガイド](wam.md)
- [TypeScript reference](../../reference/typescript/README.md)
- [Go reference](../../reference/go/README.md)
- [共通 protocol](../../reference/protocol.md)
- [TypeScript tutorial](https://github.com/channel-io/app-tutorial-ts)
- [Go tutorial](https://github.com/channel-io/app-tutorial)
