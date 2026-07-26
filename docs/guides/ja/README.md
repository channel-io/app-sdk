# Channel App SDK ガイド

このガイドは、Channel アプリ開発者が TypeScript SDK と Go SDK を同じ考え方で使えるようにまとめたものです。

## 推奨ドキュメント順序

1. [最初のアプリ Quickstart](quickstart.md): private app を作成し、Command、WAM、message flow を実行します。
2. [基本概念](concepts.md): Function、Extension、WAM、authentication、token の境界を理解します。
3. [Function 登録](functions.md): wire contract と standalone typed app Function を確認します。
4. [Command ガイド](extensions/command.md): metadata、action、autocomplete を実装します。
5. [WAM ガイド](wam.md): React UI、host authorization、app/native Function call を実装します。
6. [アプリ開発完全ガイド](app-development.md): app の設計、security、deployment、operation を確認します。
7. [Extension 完全ガイドと 16 の TypeScript/Go recipe](extensions.md): 必要な capability と implementation contract を選択します。
8. 言語別 API は [TypeScript reference](../../reference/typescript/README.md) または
   [Go reference](../../reference/go/README.md) で確認します。
9. 実装中は完全な [TypeScript app tutorial](https://github.com/channel-io/app-tutorial-ts) または
   [Go app tutorial](https://github.com/channel-io/app-tutorial) を参照します。

## SDK の選び方

NestJS、Zod、WAM React 開発には TypeScript SDK が向いています。Go サービスで typed
function、native client、extension helper を使う場合は Go SDK が向いています。

現在の contract は guide と public SDK export が定義し、tutorial はその contract の完全な
runnable implementation を提供します。

## 実行可能な例

- [TypeScript app tutorial](https://github.com/channel-io/app-tutorial-ts)
- [Go app tutorial](https://github.com/channel-io/app-tutorial)

## 言語別リファレンス

- [TypeScript reference map](../../reference/typescript/README.md)
- [Go reference](../../reference/go/README.md): Function、server、authentication と token、Extension、native Function、WAM integration
