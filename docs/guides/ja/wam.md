# WAM ガイド

WAM（Web App Module）は Channel client 内で開く React web UI です。App server ではなく、server
credential を保持しません。Command、widget、custom tab など、user interaction が必要な
Extension action で使用します。

## Action から WAM を開く

Function が次の action result を返すと、Channel client が WAM を開きます。

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

`appId` は公開識別子で、`name` が WAM route を選択します。`wamArgs` は browser code から読める
ため、secret、token、provider credential、customer の raw content を入れないでください。

## Endpoint と React setup

Developer portal には WAM root を登録し、build した SPA を `${WAM_ENDPOINT}/${name}` で提供します。

```text
WAM Endpoint: https://app.example.com/resource/wam
実際の WAM:   https://app.example.com/resource/wam/tutorial
```

React root を `WamProvider` でラップします。

```tsx
import React from "react";
import ReactDOM from "react-dom/client";
import { WamProvider } from "@channel.io/app-sdk-wam";
import App from "./App";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <WamProvider>
      <App />
    </WamProvider>
  </React.StrictMode>,
);
```

Go app も同じ TypeScript/React WAM package を使用します。Go server は WAM action と Function を
提供し、static SPA route は別に mount します。

## Runtime data と trust boundary

Host が注入した値は `useWamData` または `useTypedWamData` で読み取ります。Surface によって
`appId`、`channelId`、`managerId`、`chatId`、`chatType`、`rootMessageId`、`wamArgs` が提供される
場合があります。Optional 値が常に存在すると仮定せず、schema で検証してください。

WAM は Channel host が管理する manager/user authorization を使用します。App Secret、Signing
Key、app token、channel token を WAM bundle や runtime data に渡さないでください。

## App Function と Native Function の呼び出し

App の business logic や app/bot 権限の処理には `useCallFunction` を使用します。Server は
`TokenManager` で channel token を取得し、必要な operation を実行します。

```tsx
const appId = useWamData("appId") as string;
const { call, loading, error } = useCallFunction({
  appId,
  name: "orders.get",
});

const order = await call({ orderId: "order-1" });
```

現在の manager/user が明示的に実行する Channel operation にだけ `useNativeFunction` を使用します。
Authorization は現在の Channel surface と role から host が判断し、server の `TokenManager` が
代わりに発行することはできません。

```tsx
const { call } = useNativeFunction({ name: "writeGroupMessageAsManager" });
await call({ channelId, groupId, dto: { plainText: "Hello" } });
```

SDK が公開する Native Function name と input type だけを使用し、必要な permission を有効にします。

## Resize と close

初期 size と content 変更後の resize には `useWamSize`、終了には `useWamClose` を使用します。

```tsx
const { setSize } = useWamSize();
const { close } = useWamClose();

useEffect(() => setSize({ width: 480, height: 320 }), [setSize]);
```

他の action の後に閉じる場合は、先に `useCallFunction` または `useNativeFunction` の完了を待ち、
その後で `close()` を呼びます。失敗を user が確認する前に WAM を閉じないでください。

## Test checklist

- Install 済み private app から WAM を開き、host bridge が利用できることを確認します。
- WAM URL を直接開いた browser には host bridge がないことを処理します。
- Optional context の欠落、不正な `wamArgs`、Function error を test します。
- Manager/user permission denial と server-side channel-token flow を別々に test します。
- 初期 size、dynamic resize、正常な close を確認します。
- Bundle、source map、log、`wamArgs` に credential がないことを確認します。

Command から WAM を開く方法は [Command ガイド](extensions/command.md)、全体設計と operation は
[app 開発ガイド](app-development.md)を確認してください。正確な hook API は
[TypeScript WAM reference](../../reference/typescript/WAM.md)、Go server integration は
[Go WAM reference](../../reference/go/WAM.md)を基準にします。
